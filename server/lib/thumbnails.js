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
import sharp, { withImageJob, FALLBACK_PIXEL_LIMIT } from './sharpRuntime.js'
import ffmpegPath from 'ffmpeg-static'
import { storage } from '../storage/index.js'

// Path-safe segment: slug is a folder name and file is "<id><ext>", so neither
// should contain a slash or "..". Reject anything else.
const SAFE = /^[A-Za-z0-9._-]+$/

// Cached derivatives, all written next to the original:
//  • thumb   — tiny WebP for album/grid tiles. Two widths so a 3-col phone grid
//    pulls ~250 px while a 6-col desktop grid pulls 500 px (srcset picks one).
//  • display — resolution-capped WebP for the games and the album lightbox, so a
//    photo loads at the same bounded quality for every guest regardless of what
//    the original was (a 22 MB phone photo and a small one both normalize to
//    this) — crisp full-screen without downloading the multi-MB original.
const THUMB_WIDTHS = [250, 500]
const THUMB_QUALITY = 72
const thumbVariant = (w) => ({ suffix: `thumb-${w}`, width: w, quality: THUMB_QUALITY })
const DISPLAY = { suffix: 'display', width: 1280, quality: 82 }
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

// Pipe an image original through sharp into a capped WebP buffer. Bounds the
// longest side (fit: 'inside') so both landscape and portrait stay within the
// size, and never upscales a smaller original.
function imageToWebp(srcStream, { width, quality }) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const transform = sharp({ limitInputPixels: FALLBACK_PIXEL_LIMIT })
      .rotate() // honor EXIF orientation so portrait photos aren't sideways
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
    transform.on('data', (c) => chunks.push(c))
    transform.on('end', () => resolve(Buffer.concat(chunks)))
    transform.on('error', reject)
    srcStream.on('error', reject)
    srcStream.pipe(transform)
  })
}

// Cap concurrent video poster jobs: each downloads the original and runs ffmpeg,
// which is heavier than an image resize. Photo decodes are gated separately by
// withImageJob (sharpRuntime.js). Cached posters/derivatives skip both gates,
// so they only apply the first time each variant is generated.
// Fallback-only now that clients capture posters in the browser; one staged
// video + ffmpeg at a time keeps disk and memory pressure minimal.
const MAX_VIDEO_JOBS = 1
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
async function videoPosterWebp(slug, file, { width, quality }) {
  const tmp = path.join(os.tmpdir(), `eo-poster-${process.pid}-${videoJobs}-${file}`)
  try {
    // Staging inside the try: if the S3 read or the disk write fails halfway
    // (e.g. disk pressure), the partial temp file is still removed below.
    await pipeline(await storage.readStream(slug, file), fs.createWriteStream(tmp))
    const frame = await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, ['-ss', '0', '-i', tmp, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'])
      const chunks = []
      ff.stdout.on('data', (d) => chunks.push(d))
      ff.stderr.on('data', () => {})
      ff.on('error', reject)
      ff.on('close', (code) => (code === 0 && chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exit ${code}`))))
    })
    return await sharp(frame, { limitInputPixels: FALLBACK_PIXEL_LIMIT }).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toBuffer()
  } finally {
    fs.unlink(tmp, () => {})
  }
}

function serveWebp(res, buf) {
  res.setHeader('Content-Type', 'image/webp')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(buf)
}

// Produce one derivative's bytes. Returns { buf } on success, { none: true }
// when a video has no usable frame, or { fallback: true } when sharp can't read
// a still (the caller then serves the original). No caching / no res here — both
// the request handler and the upload-time pre-generation build on this.
async function produce(slug, file, { width, quality }) {
  if (isVideoFile(file)) {
    await acquireVideo()
    try {
      return { buf: await videoPosterWebp(slug, file, { width, quality }) }
    } catch {
      return { none: true }
    } finally {
      releaseVideo()
    }
  }
  try {
    // Acquire the gate before opening the source stream so a queued job doesn't
    // hold an idle S3 connection while it waits for a decode slot.
    return await withImageJob(async () => ({
      buf: await imageToWebp(await storage.readStream(slug, file), { width, quality }),
    }))
  } catch {
    return { fallback: true }
  }
}

// Ensure one derivative is cached (generate + store if missing). Best-effort:
// used to warm the cache at upload time so the first viewer never waits.
async function ensureDerivative(slug, file, variant) {
  const cacheName = `${file}.${variant.suffix}.webp`
  if (await storage.hasFile(slug, cacheName)) return
  const out = await produce(slug, file, variant)
  if (out.buf) {
    try {
      await storage.putBytes(slug, cacheName, out.buf, 'image/webp')
    } catch {
      /* caching best-effort */
    }
  }
}

// --- Client-provided derivatives ---------------------------------------------
// Guests' browsers resize each photo (and capture a video poster frame) before
// uploading, so the server never has to decode a full-resolution original on
// the happy path. Fields map to the same cache names the on-demand handlers
// read, making every stored derivative a permanent cache hit.
const CLIENT_FIELDS = {
  thumb250: thumbVariant(250),
  thumb500: thumbVariant(500),
  display: DISPLAY,
}
const MAX_DERIVATIVE_BYTES = 2 * 1024 * 1024
// Decode guard for the ingest transcode: client derivatives are ≤1280 px, so
// anything past a few MP in the header is hostile or broken — refuse to decode.
const DERIVATIVE_PIXEL_LIMIT = 8_000_000
const DERIVATIVE_MIME = /^image\/(webp|jpeg|png)$/

// Store whatever derivatives the client sent. Strictly best-effort: a bad or
// missing derivative must never fail the upload (pregenerate fills any gap) —
// a 4xx here would make the client treat the whole PHOTO as permanently failed.
export async function storeClientDerivatives(slug, storedName, files) {
  for (const [field, variant] of Object.entries(CLIENT_FIELDS)) {
    const f = files?.[field]?.[0]
    if (!f) continue
    try {
      if (f.size > MAX_DERIVATIVE_BYTES || !DERIVATIVE_MIME.test(f.mimetype || '')) continue
      const cacheName = `${storedName}.${variant.suffix}.webp`
      let buf
      if (f.mimetype === 'image/webp') {
        // Header-only sanity check (no pixel decode), then store bytes as-is.
        const meta = await sharp(f.path, { limitInputPixels: DERIVATIVE_PIXEL_LIMIT }).metadata()
        if (!meta.width || meta.width > variant.width * 2 || (meta.height || 0) > variant.width * 2) continue
        buf = await fs.promises.readFile(f.path)
      } else {
        // Safari cannot encode WebP in canvas.toBlob, so iPhones send JPEG.
        // Normalize it to webp so the cache name and the hardcoded image/webp
        // response header stay truthful. Bounded input (≤2 MB, ≤8 MP) makes
        // this ~100× lighter than a full-resolution original decode.
        buf = await withImageJob(() =>
          sharp(f.path, { limitInputPixels: DERIVATIVE_PIXEL_LIMIT })
            .resize({ width: variant.width, height: variant.width, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: variant.quality })
            .toBuffer(),
        )
      }
      await storage.putBytes(slug, cacheName, buf, 'image/webp')
    } catch {
      /* best-effort — pregenerate covers the gap */
    }
  }
}

// Warm every derivative for a freshly uploaded file so the album grid and
// lightbox load from cache on first view. Images get both thumb widths + the
// display size; videos only need the poster thumbs. Fire-and-forget.
export async function pregenerate(slug, file) {
  if (!slug || !file || !SAFE.test(slug) || !SAFE.test(file)) return
  const variants = THUMB_WIDTHS.map(thumbVariant)
  if (!isVideoFile(file)) variants.push(DISPLAY)
  for (const v of variants) {
    try {
      await ensureDerivative(slug, file, v)
    } catch {
      /* best-effort */
    }
  }
}

// Build a request handler for one derivative size. Both /thumb and /display
// share the same cache-then-generate flow; they differ only in the cap, the
// quality, and the cache filename suffix. `variantFor` resolves the size from
// the request (the thumb endpoint reads an allowed `?w=`).
function makeHandler(variantFor) {
  return async function handler(req, res, next) {
    try {
      const slug = String(req.query.slug || '')
      const file = String(req.query.file || '')
      if (!SAFE.test(slug) || !SAFE.test(file)) {
        return res.status(400).json({ error: 'bad path' })
      }
      const variant = variantFor(req)
      const cacheName = `${file}.${variant.suffix}.webp`

      // Cache hit: stream the stored derivative.
      if (await storage.hasFile(slug, cacheName)) {
        res.setHeader('Content-Type', 'image/webp')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        const cached = await storage.readStream(slug, cacheName)
        cached.on('error', () => {
          if (!res.headersSent) res.status(404).end()
          else res.destroy()
        })
        return cached.pipe(res)
      }

      // Cache miss — generate, cache, serve.
      const out = await produce(slug, file, variant)
      if (out.none) {
        // No frame (unsupported/corrupt video): 404 so the client shows its
        // placeholder — never stream the whole video into an <img>.
        return res.status(404).end()
      }
      if (out.fallback) {
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
        await storage.putBytes(slug, cacheName, out.buf, 'image/webp')
      } catch {
        /* caching best-effort */
      }
      serveWebp(res, out.buf)
    } catch (err) {
      next(err)
    }
  }
}

// Grid tiles come in two widths; clamp `?w=` to the allowed set (default 500).
function thumbVariantFor(req) {
  const w = Number(req.query.w)
  return thumbVariant(THUMB_WIDTHS.includes(w) ? w : 500)
}

// GET /api/uploads/thumb?slug=&file=&w=250|500  — tiny grid tile
export const thumbHandler = makeHandler(thumbVariantFor)
// GET /api/uploads/display?slug=&file=  — resolution-capped display image
export const displayHandler = makeHandler(() => DISPLAY)
