import { Router } from 'express'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'
import { listPublic, publicIdSet, addPublic, removePublic } from '../lib/publicAlbum.js'
import { downloadFileHandler } from './uploadsDownload.js'

// Album uploads. The front-end uploads one file per request (so each gets its
// own progress bar) and runs a few in parallel. Files first land in a temp dir,
// then the storage driver moves them into the per-uploader folder (local) or
// streams them to the bucket (S3) — large videos never sit fully in memory.
export const uploadsRouter = Router()

const TEMP_DIR = path.join(os.tmpdir(), 'eo-uploads')
fs.mkdirSync(TEMP_DIR, { recursive: true })

const upload = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB ceiling per file
})

// Shape returned to the public gallery — no internal fields.
function publicView(e) {
  return { id: e.id, url: e.url, type: e.type, uploadedAt: e.uploadedAt, displayName: e.displayName }
}

// The folder slug is fixed at first upload and baked into the stable media URL
// ("/media/<slug>/<storedName>"), so derive it from there — robust even if the
// guest later renames their profile.
function slugFromUrl(url) {
  return String(url || '').split('/')[2] || ''
}

// POST /api/uploads  (multipart: uploaderId, displayName, firstName, lastName, file)
uploadsRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' })
    const item = await storage.putUpload({
      displayName: req.body.displayName || 'Misafir',
      uploaderId: req.body.uploaderId || 'anon',
      firstName: req.body.firstName || '',
      lastName: req.body.lastName || '',
      tempPath: req.file.path,
      fileId: nanoid(12),
      ext: path.extname(req.file.originalname).toLowerCase(),
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    })
    res.status(201).json(item)
  } catch (err) {
    next(err)
  }
})

// GET /api/uploads/file?slug=&file=&name=&type=  → stream one stored file from
// our own origin. All album media is public, so no auth. The viewer fetches this
// (not /media) to save/share: /media 302-redirects to a presigned S3 URL, which
// fetch() cannot read into a blob without S3 CORS — streaming server-side avoids
// that entirely and works for both the local and S3 drivers.
uploadsRouter.get('/file', downloadFileHandler)

// GET /api/uploads/public  → the shared "Düğün Albümü", newest first. No auth;
// only items guests/admin chose to make public are ever listed here.
uploadsRouter.get('/public', async (_req, res, next) => {
  try {
    res.json({ items: (await listPublic()).map(publicView) })
  } catch (err) {
    next(err)
  }
})

// GET /api/uploads?uploaderId=...  → only this device's (non-deleted) items,
// each annotated with whether it is currently shared to the public album.
uploadsRouter.get('/', async (req, res, next) => {
  try {
    const { uploaderId } = req.query
    if (!uploaderId) return res.json({ items: [] })
    const items = await storage.getUploads(uploaderId)
    const pub = await publicIdSet()
    res.json({ items: items.map((i) => ({ ...i, public: pub.has(i.id) })) })
  } catch (err) {
    next(err)
  }
})

// POST /api/uploads/:id/public  (body: uploaderId, displayName, public)
// Promote/demote one of the caller's own uploads. Author-scoped: we only ever
// look at this device's items, so a guest can never publish someone else's.
uploadsRouter.post('/:id/public', async (req, res, next) => {
  try {
    const { uploaderId, displayName } = req.body || {}
    const makePublic = !!req.body?.public
    if (!uploaderId) return res.status(400).json({ error: 'uploaderId required' })
    const mine = await storage.getUploads(uploaderId)
    const item = mine.find((i) => i.id === req.params.id)
    if (!item) return res.status(404).json({ error: 'not found' })
    if (makePublic) {
      await addPublic({
        id: item.id,
        slug: slugFromUrl(item.url),
        url: item.url,
        type: item.type,
        uploadedAt: item.uploadedAt,
        uploaderId,
        displayName: displayName || 'Misafir',
      })
    } else {
      await removePublic(item.id)
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Soft-delete keeps an audit trail so the couple sees who removed what. A
// deleted photo also leaves the public album.
uploadsRouter.post('/:id/delete', async (req, res, next) => {
  try {
    const { uploaderId, displayName } = req.body || {}
    const ok = await storage.softDeleteUpload({
      uploaderId: uploaderId || 'anon',
      displayName: displayName || 'Misafir',
      id: req.params.id,
    })
    if (!ok) return res.status(404).json({ error: 'not found' })
    await removePublic(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
