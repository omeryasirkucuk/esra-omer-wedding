// Admin: stream one stored album file through our own origin (no S3 round-trip
// for the browser). The client downloads each selected file from here — on a
// phone it bundles them into the native share sheet (Save to Photos), on a
// desktop it downloads them individually. No zip.
import { storage } from '../storage/index.js'

// Path-safe segment: storedName is "<id><ext>" and slug is a folder name, so
// neither should ever contain a slash or "..". Reject anything that does.
const SAFE = /^[A-Za-z0-9._-]+$/

// Build an RFC 5987 Content-Disposition that survives Turkish characters: an
// ASCII-only fallback plus a UTF-8 encoded copy.
function contentDisposition(name) {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function downloadFileHandler(req, res, next) {
  try {
    const slug = String(req.query.slug || '')
    const file = String(req.query.file || '') // storedName, e.g. "<id>.jpg"
    const name = String(req.query.name || file) // original name for the download
    const type = String(req.query.type || '') // mime, used for the response type

    if (!SAFE.test(slug) || !SAFE.test(file)) {
      return res.status(400).json({ error: 'bad path' })
    }

    const stream = await storage.readStream(slug, file)
    res.setHeader('Content-Type', type || 'application/octet-stream')
    res.setHeader('Content-Disposition', contentDisposition(name))
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).end()
      else res.destroy()
    })
    stream.pipe(res)
  } catch (e) {
    next(e)
  }
}
