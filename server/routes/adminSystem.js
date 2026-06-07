// Admin "System" tab API: a read-only snapshot of the deployment config
// (storage driver, env-derived settings, masked secrets with an explicit
// reveal action) plus management of the two single storage-backed assets —
// the invitation music and the link-preview (OG) image.
//
// Mounted inside routes/admin.js AFTER the auth middleware, so every endpoint
// here requires a valid admin token.
import { Router } from 'express'
import multer from 'multer'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { storage } from '../storage/index.js'
import { MUSIC_KEY, OG_IMAGE_KEY } from '../lib/objectKeys.js'
import {
  ADMIN_SECRET,
  ADMIN_SECRET_FROM_ENV,
  ADMIN_USERS_FROM_ENV,
  loadAdminUsers,
  adminUsersValue,
} from '../lib/adminAuthConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const upload = multer({
  dest: path.join(os.tmpdir(), 'eo-admin-system'),
  limits: { fileSize: 25 * 1024 * 1024 },
})

// Masked preview for the config table: enough to recognize a value without
// exposing it ("AKIA••••…X2").
function mask(value) {
  const s = String(value || '')
  if (!s) return ''
  if (s.length <= 6) return '••••••'
  return `${s.slice(0, 4)}••••…${s.slice(-2)}`
}

// Values the reveal endpoint may return, resolved lazily so the snapshot and
// the reveal always agree.
const REVEALABLE = {
  AWS_ACCESS_KEY_ID: () => process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: () => process.env.AWS_SECRET_ACCESS_KEY || '',
  ADMIN_SECRET: () => ADMIN_SECRET,
  ADMIN_USERS: () => adminUsersValue(),
  S3_BUCKET: () => process.env.S3_BUCKET || '',
  MUSIC_KEY: () => MUSIC_KEY,
}

// Bundled music fallback the /api/music route serves when nothing is uploaded.
function bundledMusicExists() {
  const root = path.join(__dirname, '..', '..')
  return (
    fs.existsSync(path.join(root, 'dist', 'music', 'davetiye-music.mp3')) ||
    fs.existsSync(path.join(root, 'public', 'music', 'davetiye-music.mp3'))
  )
}

export const adminSystemRouter = Router()

// Full config snapshot for the System tab.
adminSystemRouter.get('/system', async (_req, res, next) => {
  try {
    const [music, siteAssets] = await Promise.all([
      storage.objectInfo(MUSIC_KEY),
      storage.getDoc('site_assets'),
    ])
    res.json({
      storage: {
        driver: storage.name,
        dir: storage.name === 'local' ? path.resolve(process.env.STORAGE_DIR || './data') : undefined,
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || 'eu-central-1',
      },
      music: {
        key: MUSIC_KEY,
        keyFromEnv: Boolean(process.env.MUSIC_KEY),
        uploaded: music.exists,
        size: music.size,
        modifiedAt: music.modifiedAt,
        bundledFallback: bundledMusicExists(),
      },
      ogImage: siteAssets?.ogImage || null,
      admin: {
        users: loadAdminUsers().map((u) => u.u),
        usersFromEnv: ADMIN_USERS_FROM_ENV,
        secretFromEnv: ADMIN_SECRET_FROM_ENV,
      },
      runtime: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT || process.env.API_PORT || 8787),
      },
      secrets: Object.entries(REVEALABLE).map(([key, value]) => ({
        key,
        set: Boolean(value()),
        preview: mask(value()),
      })),
    })
  } catch (e) {
    next(e)
  }
})

// Explicit plaintext reveal for one allow-listed key (the table shows masked
// values by default; each row has its own "show" action).
adminSystemRouter.post('/system/reveal', (req, res) => {
  const { key } = req.body || {}
  const getter = REVEALABLE[key]
  if (!getter) return res.status(400).json({ error: 'unknown key' })
  res.json({ key, value: getter() })
})

// --- Invitation music -------------------------------------------------------
// Uploading writes to MUSIC_KEY, which is exactly what /api/music streams, so
// the (iOS-critical) serving path never changes.

adminSystemRouter.post('/music', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' })
    const okType =
      (req.file.mimetype || '').startsWith('audio/') ||
      /\.(mp3|m4a)$/i.test(req.file.originalname || '')
    if (!okType) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ error: 'audio file required' })
    }
    await storage.putObject(MUSIC_KEY, req.file.path, 'audio/mpeg')
    res.status(201).json(await storage.objectInfo(MUSIC_KEY))
  } catch (e) {
    next(e)
  }
})

adminSystemRouter.delete('/music', async (_req, res, next) => {
  try {
    await storage.deleteObject(MUSIC_KEY)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// --- OG (link preview) image ------------------------------------------------
// Stored at a fixed key and described in the `site_assets` doc (mime/size), so
// the public /og.png route can serve it with the right content type. When no
// upload exists, /og.png falls back to the bundled public/og.png.

adminSystemRouter.post('/og-image', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' })
    const mime = req.file.mimetype || ''
    if (!/^image\/(png|jpe?g|webp)$/.test(mime)) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ error: 'png/jpeg/webp image required' })
    }
    await storage.putObject(OG_IMAGE_KEY, req.file.path, mime)
    const assets = (await storage.getDoc('site_assets')) || {}
    assets.ogImage = { mime, size: req.file.size, uploadedAt: new Date().toISOString() }
    await storage.saveDoc('site_assets', assets)
    res.status(201).json(assets.ogImage)
  } catch (e) {
    next(e)
  }
})

adminSystemRouter.delete('/og-image', async (_req, res, next) => {
  try {
    await storage.deleteObject(OG_IMAGE_KEY)
    const assets = (await storage.getDoc('site_assets')) || {}
    delete assets.ogImage
    await storage.saveDoc('site_assets', assets)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
