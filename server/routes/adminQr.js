// "QR Oluştur" tab API: stores the high-resolution poster PNGs the couple
// generates (table cards + entrance signs) and lists them for re-download. The
// PNG is produced client-side (so it matches the on-brand preview exactly); the
// server just persists the bytes and keeps a small gallery index.
//
// Mounted inside adminRouter, after its auth gate, so every route here inherits
// the admin token check.
import { Router } from 'express'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'
import { listPosters, addPoster, removePoster } from '../lib/qrPosters.js'
import { QR_UPLOADER_ID } from '../lib/reservedUploaders.js'

const posterUpload = multer({
  dest: path.join(os.tmpdir(), 'eo-qr-posters'),
  // High-res posters for 70×100 prints can be large (esp. with a photo).
  limits: { fileSize: 80 * 1024 * 1024 },
})

export const adminQrRouter = Router()

const POSTER_TYPES = new Set(['table', 'guest', 'entrance', 'table-tent', 'guest-tent'])
// The folder slug is fixed at first upload and baked into the stable media URL
// ("/media/<slug>/<storedName>"), so derive it from there for soft-delete.
const slugFromUrl = (url) => String(url || '').split('/')[2] || ''

// Remembered form values for the generators (titles, address, date, etc.) so
// the couple doesn't retype them every visit. One small doc, shape decided by
// the client: { table: {...}, guest: {...}, entrance: {...} }.
adminQrRouter.get('/qr-content', async (_req, res, next) => {
  try {
    res.json(await storage.getDoc('qr_content'))
  } catch (e) {
    next(e)
  }
})
adminQrRouter.put('/qr-content', async (req, res, next) => {
  try {
    await storage.saveDoc('qr_content', req.body || {})
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// GET /api/admin/qr-posters → every saved poster, newest first.
adminQrRouter.get('/qr-posters', async (_req, res, next) => {
  try {
    res.json({ posters: await listPosters() })
  } catch (e) {
    next(e)
  }
})

// POST /api/admin/qr-posters  (multipart: file=PNG, type, label)
// Persists the poster and returns its gallery entry (with a stable /media URL).
adminQrRouter.post('/qr-posters', posterUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' })
    const type = POSTER_TYPES.has(req.body?.type) ? req.body.type : 'table'
    const label = String(req.body?.label || '').trim().slice(0, 80)
    // Every poster lands in one fixed folder so the gallery is easy to manage and
    // the bytes get a stable, never-expiring /media URL (local file or S3 object).
    const item = await storage.putUpload({
      displayName: 'QR Posterleri',
      uploaderId: QR_UPLOADER_ID,
      firstName: '',
      lastName: '',
      tempPath: req.file.path,
      fileId: nanoid(12),
      ext: '.png',
      originalName: req.file.originalname || 'poster.png',
      mime: 'image/png',
      size: req.file.size,
    })
    const entry = await addPoster({
      id: item.id,
      slug: slugFromUrl(item.url),
      type,
      label,
      url: item.url,
    })
    res.status(201).json(entry)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/admin/qr-posters/:id → drop from the gallery and soft-delete the
// stored PNG. The couple decides what to keep; nothing is removed automatically.
adminQrRouter.delete('/qr-posters/:id', async (req, res, next) => {
  try {
    const removed = await removePoster(req.params.id)
    if (!removed) return res.status(404).end()
    await storage.softDeleteBySlug(removed.slug, removed.id)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
