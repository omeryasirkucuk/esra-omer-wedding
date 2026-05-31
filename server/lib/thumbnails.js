// On-demand album thumbnails. The grids show a small WebP instead of the full
// original (2–5 MB phone photos), cutting bytes and S3 egress ~50–100×. The
// derivative is generated on first request and cached next to the original, so
// every later request — including the public album's 5 s poll — is a cache hit.
//
// Full resolution is untouched: the original is still served at /media and saved
// via /api/uploads/file; only the grid <img> points here. Videos never hit this
// endpoint (the client shows a placeholder tile), so no frame extraction needed.
import sharp from 'sharp'
import { storage } from '../storage/index.js'

// Path-safe segment: slug is a folder name and file is "<id><ext>", so neither
// should contain a slash or "..". Reject anything else.
const SAFE = /^[A-Za-z0-9._-]+$/

const THUMB_WIDTH = 500 // covers a ~150 px tile at up to 3× device pixel ratio

// Minimal extension → mime map for the fallback (when sharp can't process a file
// we stream the original, and a correct type lets <img> render it).
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

// Pipe an original through sharp and collect the resized WebP into a buffer.
function toWebpThumb(srcStream) {
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

// Stream the original bytes as a fallback (sharp failed, e.g. an unsupported
// codec) so the tile still shows something.
async function streamOriginal(slug, file, res) {
  const s = await storage.readStream(slug, file)
  res.setHeader('Content-Type', mimeFromExt(file))
  res.setHeader('Cache-Control', 'public, max-age=86400')
  s.on('error', () => {
    if (!res.headersSent) res.status(404).end()
    else res.destroy()
  })
  s.pipe(res)
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

    // Cache miss: generate from the original, then cache + serve.
    let buf
    try {
      buf = await toWebpThumb(await storage.readStream(slug, file))
    } catch {
      // sharp couldn't read it (unsupported/corrupt) — serve the original instead.
      return streamOriginal(slug, file, res)
    }
    try {
      await storage.putBytes(slug, thumbName, buf, 'image/webp')
    } catch {
      /* caching is best-effort; still serve the bytes we have */
    }
    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(buf)
  } catch (err) {
    next(err)
  }
}
