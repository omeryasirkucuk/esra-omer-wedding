// On-demand album thumbnails. The grids show a small WebP instead of the full
// original (2–5 MB photos, or a video), cutting bytes and S3 egress ~50–100×.
// The derivative is generated on first request and cached next to the original,
// so every later request — including the public album's poll — is a cache hit.
//
// Images are resized with sharp. Videos get a real poster frame: ffmpeg grabs
// the first frame, sharp turns it into the same small WebP. Both cache under
// "<file>.thumb.webp", so the client points one <img> at this endpoint either
// way. Full resolution is untouched (served at /media, saved via /api/uploads/file).
import { spawn } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { storage } from '../storage/index.js'

// Path-safe segment: slug is a folder name and file is "<id><ext>", so neither
// should contain a slash or "..". Reject anything else.
const SAFE = /^[A-Za-z0-9._-]+$/

const THUMB_WIDTH = 500 // covers a ~150 px tile at up to 3× device pixel ratio
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.3gp', '.avi', '.mkv'])

function isVideoFile(file) {
  const dot = file.lastIndexOf('.')
  return dot >= 0 && VIDEO_EXTS.has(file.slice(dot).toLowerCase())
}

// Extension → mime for the image fallback (when sharp can't process a still and
// we stream the original, a correct type lets <img> render it).
const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}
function mimeFromExt(file) {
  const dot = file.lastIndexOf('.')
  return (dot >= 0 && EXT_MIME[file.slice(dot).toLowerCase()]) || 'application/octet-stream'
}

// Pipe an image original through sharp into a small WebP buffer.
function imageToWebp(srcStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const transform = sharp()
      .rotate() // honor EXIF orientation so portrait photos aren't sideways
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 72 })
    transform.on('data', (c) => chunks.push(c))
    transform.on('end', () => resolve(Buffer.concat(chunks)))
    transform.on('error', reject)
    srcStream.on('error', reject)
    srcStream.pipe(transform)
  })
}

// Cap concurrent video poster jobs: each downloads the original and runs ffmpeg,
// which is heavier than an image resize. Photos are unaffected. Cached posters
// skip this entirely, so it only gates the first view of each video.
const MAX_VIDEO_JOBS = 2
let videoJobs = 0
const videoWaiters = []
function acquireVideo() {
  if (videoJobs < MAX_VIDEO_JOBS) {
    videoJobs++
    return Promise.resolve()
  }
  return new Promise((resolve) => videoWaiters.push(resolve))
}
function releaseVideo() {
  videoJobs--
  const next = videoWaiters.shift()
  if (next) {
    videoJobs++
    next()
  }
}

// Grab the first frame of a video as a small WebP. ffmpeg needs a seekable file
// (phone videos often store the moov atom at the end), so the original is staged
// to a temp file first, then the frame is piped through sharp.
async function videoPosterWebp(slug, file) {
  const tmp = path.join(os.tmpdir(), `eo-poster-${process.pid}-${videoJobs}-${file}`)
  await pipeline(await storage.readStream(slug, file), fs.createWriteStream(tmp))
  try {
    const frame = await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, ['-ss', '0', '-i', tmp, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'])
      const chunks = []
      ff.stdout.on('data', (d) => chunks.push(d))
      ff.stderr.on('data', () => {})
      ff.on('error', reject)
      ff.on('close', (code) => (code === 0 && chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exit ${code}`))))
    })
    return await sharp(frame).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
  } finally {
    fs.unlink(tmp, () => {})
  }
}

function serveWebp(res, buf) {
  res.setHeader('Content-Type', 'image/webp')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(buf)
}

// GET /api/uploads/thumb?slug=&file=
export async function thumbHandler(req, res, next) {
  try {
    const slug = String(req.query.slug || '')
    const file = String(req.query.file || '')
    if (!SAFE.test(slug) || !SAFE.test(file)) {
      return res.status(400).json({ error: 'bad path' })
    }
    const thumbName = `${file}.thumb.webp`

    // Cache hit: stream the stored derivative.
    if (await storage.hasFile(slug, thumbName)) {
      res.setHeader('Content-Type', 'image/webp')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      const cached = await storage.readStream(slug, thumbName)
      cached.on('error', () => {
        if (!res.headersSent) res.status(404).end()
        else res.destroy()
      })
      return cached.pipe(res)
    }

    // Cache miss — generate, cache, serve.
    if (isVideoFile(file)) {
      await acquireVideo()
      let buf
      try {
        buf = await videoPosterWebp(slug, file)
      } catch {
        // No frame (unsupported/corrupt): 404 so the client shows its placeholder
        // — never stream the whole video into an <img>.
        return res.status(404).end()
      } finally {
        releaseVideo()
      }
      try {
        await storage.putBytes(slug, thumbName, buf, 'image/webp')
      } catch {
        /* caching best-effort */
      }
      return serveWebp(res, buf)
    }

    let buf
    try {
      buf = await imageToWebp(await storage.readStream(slug, file))
    } catch {
      // sharp couldn't read it (unsupported/corrupt) — serve the original still.
      const s = await storage.readStream(slug, file)
      res.setHeader('Content-Type', mimeFromExt(file))
      res.setHeader('Cache-Control', 'public, max-age=86400')
      s.on('error', () => {
        if (!res.headersSent) res.status(404).end()
        else res.destroy()
      })
      return s.pipe(res)
    }
    try {
      await storage.putBytes(slug, thumbName, buf, 'image/webp')
    } catch {
      /* caching best-effort */
    }
    serveWebp(res, buf)
  } catch (err) {
    next(err)
  }
}
