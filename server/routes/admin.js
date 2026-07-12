import { Router } from 'express'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'
import { downloadFileHandler, downloadZipHandler } from './uploadsDownload.js'
import { publicIdSet, addPublic, removePublic } from '../lib/publicAlbum.js'
import { pregenerate } from '../lib/thumbnails.js'
import { GAME_UPLOADER_ID, isReservedUploader } from '../lib/reservedUploaders.js'
import { ADMIN_SECRET } from '../lib/adminAuthConfig.js'
import { verifyCredentials, userExists } from '../lib/adminUsers.js'
import { adminSystemRouter } from './adminSystem.js'
import { adminQrRouter } from './adminQr.js'
import { adminGiftsRouter } from './adminGifts.js'
import { RSVP_GROUPS, RSVP_SIDES, cleanTag, cleanNote } from '../lib/attendeeTags.js'

const photoUpload = multer({
  dest: path.join(os.tmpdir(), 'eo-admin-photos'),
  limits: { fileSize: 200 * 1024 * 1024 },
})

// Admin API for the couple. Accounts come from lib/adminUsers.js: the
// storage-backed set managed in the System tab when present, else ADMIN_USERS
// env / the built-in defaults. Auth is a stateless HMAC bearer token — enough
// for a private, single-event dashboard.
const SECRET = ADMIN_SECRET

function tokenFor(username) {
  const sig = crypto.createHmac('sha256', SECRET).update(username).digest('hex')
  return `${Buffer.from(username).toString('base64url')}.${sig}`
}
function verify(token) {
  if (!token) return null
  const [b, sig] = token.split('.')
  if (!b || !sig) return null
  let username
  try {
    username = Buffer.from(b, 'base64url').toString()
  } catch {
    return null
  }
  const expected = crypto.createHmac('sha256', SECRET).update(username).digest('hex')
  const a = Buffer.from(sig)
  const e = Buffer.from(expected)
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null
  return username
}

export const adminRouter = Router()

adminRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    const ok = await verifyCredentials(username, password)
    if (!ok) return res.status(401).json({ error: 'invalid credentials' })
    res.json({ token: tokenFor(username), username })
  } catch (e) {
    next(e)
  }
})

// Everything below requires a valid token. Normally the Bearer header carries
// it, but streamed file downloads are plain browser navigations that can't set
// headers, so a `?token=` query fallback is accepted as well.
adminRouter.use(async (req, res, next) => {
  const headerToken = (req.headers.authorization || '').replace(/^Bearer /, '')
  const token = headerToken || (typeof req.query.token === 'string' ? req.query.token : '')
  const user = verify(token)
  // The token also has to name a still-existing account, so removing an admin
  // (or replacing the account set) revokes that admin's sessions.
  if (!user || !(await userExists(user))) return res.status(401).json({ error: 'unauthorized' })
  req.adminUser = user
  next()
})

// System tab endpoints (config snapshot, secret reveal, music/OG uploads).
// Mounted after the auth gate so every route inherits it.
adminRouter.use(adminSystemRouter)

// "QR Oluştur" tab endpoints (generate/list/delete printable QR posters).
adminRouter.use(adminQrRouter)

// "Hediye" tab endpoints (wedding gift ledger + conversion rates).
adminRouter.use(adminGiftsRouter)

adminRouter.get('/overview', async (req, res, next) => {
  try {
    const rsvps = await storage.getCollection('rsvp')
    const posts = (await storage.getCollection('posts')).filter((p) => !p.deleted)
    // Reserved uploaders (game images, QR posters) aren't guest media, so keep
    // them out of the album counts shown on the admin summary tab.
    const uploaders = (await storage.listAllUploads()).filter((u) => !isReservedUploader(u.uploaderId))
    const uploadsTotal = uploaders.reduce((s, u) => s + u.items.filter((i) => !i.deleted).length, 0)
    const adults = rsvps.reduce((s, r) => s + (Number(r.guests) || 0), 0)
    const children = rsvps.reduce((s, r) => s + (Number(r.children) || 0), 0)
    res.json({
      rsvpCount: rsvps.length,
      adults,
      children,
      guestsTotal: adults + children,
      uploadsTotal,
      uploadersCount: uploaders.length,
      postsCount: posts.length,
    })
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/rsvps', async (req, res, next) => {
  try {
    const rsvps = await storage.getCollection('rsvp')
    rsvps.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    res.json({ rsvps })
  } catch (e) {
    next(e)
  }
})

// Add an attendee manually (admin manages the exact headcount). Tag
// vocabulary + sanitizers are shared with the gift routes (lib/attendeeTags.js).
adminRouter.post('/rsvps', async (req, res, next) => {
  try {
    const { firstName, lastName, guests, children, attending, group, side, note } = req.body || {}
    // Surname is optional (matches the guest-facing identity model); require at
    // least one of the two so an entry always has something to show.
    const first = String(firstName || '').trim()
    const last = String(lastName || '').trim()
    if (!first && !last) return res.status(400).json({ error: 'name required' })
    const rsvps = await storage.getCollection('rsvp')
    const entry = {
      id: nanoid(10),
      firstName: first,
      lastName: last,
      attending: attending === false ? false : true,
      guests: Number(guests) || 1,
      children: Number(children) || 0,
      group: cleanTag(group, RSVP_GROUPS),
      side: cleanTag(side, RSVP_SIDES),
      note: cleanNote(note),
      createdAt: new Date().toISOString(),
      addedByAdmin: true,
    }
    rsvps.push(entry)
    await storage.saveCollection('rsvp', rsvps)
    res.status(201).json(entry)
  } catch (e) {
    next(e)
  }
})

// Edit an attendee's details / counts.
adminRouter.post('/rsvps/update', async (req, res, next) => {
  try {
    const { id, firstName, lastName, guests, children, attending, group, side, note } = req.body || {}
    const rsvps = await storage.getCollection('rsvp')
    const entry = rsvps.find((r) => r.id === id)
    if (!entry) return res.status(404).json({ error: 'not found' })
    if (firstName !== undefined) entry.firstName = String(firstName).trim()
    if (lastName !== undefined) entry.lastName = String(lastName).trim()
    if (guests !== undefined) entry.guests = Number(guests) || 0
    if (children !== undefined) entry.children = Number(children) || 0
    if (attending !== undefined) entry.attending = !!attending
    if (group !== undefined) entry.group = cleanTag(group, RSVP_GROUPS)
    if (side !== undefined) entry.side = cleanTag(side, RSVP_SIDES)
    if (note !== undefined) entry.note = cleanNote(note)
    await storage.saveCollection('rsvp', rsvps)
    res.json(entry)
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/rsvps/delete', async (req, res, next) => {
  try {
    const { id } = req.body || {}
    const rsvps = await storage.getCollection('rsvp')
    const next2 = rsvps.filter((r) => r.id !== id)
    if (next2.length === rsvps.length) return res.status(404).end()
    await storage.saveCollection('rsvp', next2)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/uploaders', async (req, res, next) => {
  try {
    // Reserved uploaders (game images, QR posters) never belong in the album
    // panel — hiding them here also makes them un-promotable to the public album.
    const uploaders = (await storage.listAllUploads()).filter((u) => !isReservedUploader(u.uploaderId))
    const pub = await publicIdSet()
    for (const u of uploaders) {
      u.items = (u.items || []).map((i) => ({ ...i, public: pub.has(i.id) }))
    }
    res.json({ uploaders })
  } catch (e) {
    next(e)
  }
})

// Promote/demote any guest's upload to the public "Düğün Albümü".
adminRouter.post('/uploads/public', async (req, res, next) => {
  try {
    const { slug, id, displayName } = req.body || {}
    const makePublic = !!req.body?.public
    if (!slug || !id) return res.status(400).json({ error: 'slug and id required' })
    if (!makePublic) {
      await removePublic(id)
      return res.status(204).end()
    }
    const uploaders = await storage.listAllUploads()
    const owner = uploaders.find((u) => u.slug === slug)
    // Never promote reserved uploads (game images, QR posters) to the album.
    if (owner && isReservedUploader(owner.uploaderId)) return res.status(400).json({ error: 'reserved' })
    const item = owner?.items.find((i) => i.id === id && !i.deleted)
    if (!item) return res.status(404).json({ error: 'not found' })
    await addPublic({
      id: item.id,
      slug,
      url: item.url,
      type: item.type,
      uploadedAt: item.uploadedAt,
      uploaderId: owner.uploaderId,
      displayName: displayName || owner.displayName || 'Misafir',
      lqip: item.lqip,
    })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Mobile: stream one stored file (the client fetches each for the share sheet).
adminRouter.get('/uploads/download', downloadFileHandler)
// Desktop: stream the selected files as a single ZIP.
adminRouter.get('/uploads/download-zip', downloadZipHandler)

adminRouter.post('/uploads/delete', async (req, res, next) => {
  try {
    const { slug, id } = req.body || {}
    const ok = await storage.softDeleteBySlug(slug, id)
    if (ok) await removePublic(id)
    res.status(ok ? 204 : 404).end()
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/posts', async (req, res, next) => {
  try {
    const posts = await storage.getCollection('posts')
    posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    res.json({ posts })
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/posts/delete', async (req, res, next) => {
  try {
    const { id } = req.body || {}
    const posts = await storage.getCollection('posts')
    const post = posts.find((p) => p.id === id)
    if (!post) return res.status(404).end()
    post.deleted = true
    post.deletedAt = new Date().toISOString()
    await storage.saveCollection('posts', posts)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Scoreboard: every game result, newest first, with optional per-game detail.
adminRouter.get('/scores', async (req, res, next) => {
  try {
    const scores = (await storage.getCollection('scores')).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    res.json({ scores })
  } catch (e) {
    next(e)
  }
})
adminRouter.post('/scores/delete', async (req, res, next) => {
  try {
    const { id } = req.body || {}
    const scores = await storage.getCollection('scores')
    await storage.saveCollection('scores', scores.filter((s) => s.id !== id))
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Editable site content: everything visible on the guest site (names, date,
// venue, program, quote, closing, families). Shape mirrors src/data/wedding.js.
adminRouter.get('/site-content', async (req, res, next) => {
  try {
    res.json(await storage.getDoc('site_content'))
  } catch (e) {
    next(e)
  }
})
adminRouter.put('/site-content', async (req, res, next) => {
  try {
    await storage.saveDoc('site_content', req.body || {})
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// Open/close the wedding-day surfaces (hub, board, games, album). When closed,
// the guest site shows only the invitation. Merges the single flag into the
// stored content so it never clobbers the rest of the editable site fields.
adminRouter.put('/site-open', async (req, res, next) => {
  try {
    const current = (await storage.getDoc('site_content')) || {}
    current.siteOpen = Boolean(req.body?.open)
    await storage.saveDoc('site_content', current)
    res.json({ ok: true, siteOpen: current.siteOpen })
  } catch (e) {
    next(e)
  }
})

// Editable game content (quiz, who-said, photo-guess, game images).
adminRouter.get('/games-content', async (req, res, next) => {
  try {
    res.json(await storage.getDoc('game_content'))
  } catch (e) {
    next(e)
  }
})
adminRouter.put('/games-content', async (req, res, next) => {
  try {
    await storage.saveDoc('game_content', req.body || {})
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// Upload an image used inside the games (e.g. Foto Tahmin rounds, Hafıza cards).
// Returns a stable /media URL the admin stores into the game content.
adminRouter.post('/photos', photoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' })
    const item = await storage.putUpload({
      displayName: 'Oyun Görselleri',
      uploaderId: GAME_UPLOADER_ID,
      firstName: '',
      lastName: '',
      tempPath: req.file.path,
      fileId: nanoid(12),
      ext: path.extname(req.file.originalname).toLowerCase(),
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    })
    // Warm the derivatives now so the games render the display image instantly.
    const parts = String(item.url).split('/')
    pregenerate(parts[2], parts[3]).catch(() => {})
    res.status(201).json({ url: item.url, type: item.type })
  } catch (e) {
    next(e)
  }
})
