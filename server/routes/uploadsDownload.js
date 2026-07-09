// Album downloads (admin panel and guest album), served through our own origin
// (no S3 round-trip for the browser). Two shapes:
//   • downloadFileHandler — streams one stored file. Used on mobile, where the
//     client fetches each selected file and hands them to the native share
//     sheet (Save to Photos).
//   • downloadZipHandler — streams the selected files as one ZIP. Used on
//     desktop, where a single download beats juggling many separate files.
import { ZipArchive } from 'archiver'
import { storage } from '../storage/index.js'

// Path-safe segment: storedName is "<id><ext>" and slug is a folder name, so
// neither should ever contain a slash or "..". Reject anything that does.
const SAFE = /^[A-Za-z0-9._-]+$/

// Infer a Content-Type from the file extension. Needed so the share sheet / the
// downloaded blob carries the right type (iOS only offers "Save to Photos" when
// the file is a recognized image/video). Used when the caller omits `type`.
const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.3gp': 'video/3gpp',
}
function mimeFromExt(file) {
  const dot = file.lastIndexOf('.')
  return (dot >= 0 && EXT_MIME[file.slice(dot).toLowerCase()]) || ''
}

// Build an RFC 5987 Content-Disposition that survives Turkish characters: an
// ASCII-only fallback plus a UTF-8 encoded copy.
function contentDisposition(name) {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

// Keep zip entry names unique when two uploaders used the same file name.
function uniqueName(name, used) {
  const n = used.get(name) || 0
  used.set(name, n + 1)
  if (n === 0) return name
  const dot = name.lastIndexOf('.')
  return dot > 0 ? `${name.slice(0, dot)}-${n}${name.slice(dot)}` : `${name}-${n}`
}

// Resolve [{slug,id}] into the live stored files, preserving the request order.
async function resolveSelected(items) {
  const all = await storage.listAllUploads()
  const bySlug = new Map(all.map((u) => [u.slug, u]))
  const out = []
  for (const sel of items) {
    const u = bySlug.get(sel.slug)
    if (!u) continue
    const it = (u.items || []).find((i) => i.id === sel.id && !i.deleted)
    if (it) {
      out.push({
        slug: u.slug,
        storedName: it.storedName,
        originalName: it.originalName || it.storedName,
        mime: it.mime,
      })
    }
  }
  return out
}

// Stream one stored file (mobile share sheet fetches these).
export async function downloadFileHandler(req, res, next) {
  try {
    const slug = String(req.query.slug || '')
    const file = String(req.query.file || '') // storedName, e.g. "<id>.jpg"
    const name = String(req.query.name || file) // original name for the download
    const type = String(req.query.type || '') || mimeFromExt(file) // response mime

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

// Stream the selected files as one ZIP (desktop download).
export async function downloadZipHandler(req, res, next) {
  try {
    let items = []
    try {
      items = JSON.parse(Buffer.from(String(req.query.items || ''), 'base64').toString('utf8'))
    } catch {
      /* malformed payload → handled below */
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'no items' })
    }

    const files = await resolveSelected(items)
    if (files.length === 0) return res.status(404).json({ error: 'not found' })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', contentDisposition(`esra-omer-secilenler-${files.length}.zip`))

    // "store" (no compression) keeps a 512 MB instance calm: media is already
    // compressed, so we only pay I/O, not CPU.
    const archive = new ZipArchive({ store: true })
    archive.on('error', (e) => {
      console.error('[download-zip]', e)
      res.destroy()
    })
    archive.pipe(res)

    // Add one file at a time so only a single source stream is open at once —
    // avoids holding many S3 connections idle (which can time out) for big sets.
    const used = new Map()
    for (const f of files) {
      const stream = await storage.readStream(f.slug, f.storedName)
      archive.append(stream, { name: uniqueName(f.originalName, used) })
      await new Promise((resolve, reject) => {
        archive.once('entry', resolve)
        stream.once('error', reject)
      })
    }
    await archive.finalize()
  } catch (e) {
    next(e)
  }
}
