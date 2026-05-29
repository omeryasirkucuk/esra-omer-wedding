import { Router } from 'express'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'

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

// GET /api/uploads?uploaderId=...  → only this device's (non-deleted) items.
uploadsRouter.get('/', async (req, res, next) => {
  try {
    const { uploaderId } = req.query
    if (!uploaderId) return res.json({ items: [] })
    res.json({ items: await storage.getUploads(uploaderId) })
  } catch (err) {
    next(err)
  }
})

// Soft-delete keeps an audit trail so the couple sees who removed what.
uploadsRouter.post('/:id/delete', async (req, res, next) => {
  try {
    const { uploaderId, displayName } = req.body || {}
    const ok = await storage.softDeleteUpload({
      uploaderId: uploaderId || 'anon',
      displayName: displayName || 'Misafir',
      id: req.params.id,
    })
    if (!ok) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
