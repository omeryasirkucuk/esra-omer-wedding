// Small Express server: hosts the JSON API and, in production, serves the
// built front-end. Designed for a single wedding day (~100 concurrent guests),
// so it stays deliberately minimal — no database, just the storage adapter
// (local filesystem or S3, selected by STORAGE_DRIVER).
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { storage } from './storage/index.js'
import { slugify } from './storage/shared.js'
import { MUSIC_KEY, OG_IMAGE_KEY } from './lib/objectKeys.js'
import { createIndexHandler } from './lib/metaInject.js'
import { rsvpRouter } from './routes/rsvp.js'
import { postsRouter } from './routes/posts.js'
import { uploadsRouter } from './routes/uploads.js'
import { adminRouter } from './routes/admin.js'
import { gamesRouter } from './routes/games.js'
import { siteRouter } from './routes/site.js'
import { scoresRouter } from './routes/scores.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Render (and most hosts) inject PORT; fall back to API_PORT locally.
const PORT = process.env.PORT || process.env.API_PORT || 8787
const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Uploaded media: resolved by the active storage driver (disk file locally,
// presigned redirect on S3). Stored URLs are stable and never expire.
app.get('/media/*', (req, res) => storage.mediaHandler(req, res))

// Invitation background music. On S3 it 302-redirects to a presigned URL for
// the private object; locally it falls back to a file under public/music.
// (MUSIC_KEY lives in lib/objectKeys.js, shared with the admin upload route.)

// Returns a single, stable media URL the player can use for ALL range requests.
// On S3 that's one presigned URL (fetched once → no per-range redirect churn,
// which broke playback on mobile); locally it points at the streaming route.
app.get('/api/music-url', async (_req, res) => {
  try {
    const url = await storage.signKey(MUSIC_KEY)
    if (url) return res.json({ url })
  } catch (err) {
    console.error('[music-url]', err)
  }
  res.json({ url: '/api/music' })
})

app.get('/api/music', async (req, res) => {
  // Prefer same-origin, range-capable streaming (reliable on iOS). On S3 this
  // is the unchanged original path; an admin upload simply writes MUSIC_KEY.
  if (storage.name === 's3') {
    return storage.streamMedia(MUSIC_KEY, req, res, 'audio/mpeg')
  }
  // Local driver: an admin-uploaded file under the data dir wins…
  if (await storage.hasObject(MUSIC_KEY)) {
    return storage.streamObject(MUSIC_KEY, req, res, 'audio/mpeg')
  }
  // …otherwise the bundled file (dist in production, public in dev).
  // sendFile handles Range + MIME automatically.
  for (const base of [dist, path.join(__dirname, '..', 'public')]) {
    const local = path.join(base, 'music', 'davetiye-music.mp3')
    if (fs.existsSync(local)) return res.sendFile(local)
  }
  res.status(404).end()
})

// Link-preview image: the admin-uploaded one when present (described in the
// site_assets doc so it streams with the right content type), else the bundled
// public/og.png that ships with the build.
app.get('/og.png', async (req, res) => {
  try {
    const assets = await storage.getDoc('site_assets')
    if (assets?.ogImage && (await storage.hasObject(OG_IMAGE_KEY))) {
      return storage.streamObject(OG_IMAGE_KEY, req, res, assets.ogImage.mime)
    }
  } catch {
    /* fall through to the bundled image */
  }
  for (const base of [dist, path.join(__dirname, '..', 'public')]) {
    const local = path.join(base, 'og.png')
    if (fs.existsSync(local)) return res.sendFile(local)
  }
  res.status(404).end()
})

// Calendar file served with the proper media type so iOS opens the Apple
// Calendar "add event" sheet directly (no awkward file download). Built from the
// admin-edited site content so the date always matches the site.
const WEDDING_DEFAULTS = {
  bride: 'Esra',
  groom: 'Ömer',
  dateISO: '2026-07-17T19:30:00+03:00',
  venue: {
    name: 'Family Garden Kavacık',
    address: 'Fatih Mah. Cumhuriyet Cad. İnci Sok. No:11, Beykoz / İstanbul',
    geo: { lat: 41.085757, lng: 29.113023 },
  },
}
function icsStamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
// iCalendar property-parameter values that contain ":", ";" or "," must be
// wrapped in double quotes (RFC 5545 §3.1). Apple's structured-location
// X-ADDRESS holds the street address ("No:11", commas), so it must be quoted —
// an unquoted ":" truncates the parameter and Apple drops the map entirely.
function icsParam(value) {
  return `"${String(value).replace(/"/g, "'").replace(/[\r\n]+/g, ' ')}"`
}
app.get('/api/calendar.ics', async (_req, res) => {
  let stored = {}
  try {
    stored = (await storage.getDoc('site_content')) || {}
  } catch {
    /* defaults */
  }
  const w = {
    ...WEDDING_DEFAULTS,
    ...stored,
    venue: { ...WEDDING_DEFAULTS.venue, ...(stored.venue || {}) },
  }
  const start = new Date(w.dateISO)
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
  const locationText = `${w.venue.name}, ${w.venue.address}`
  // Couple slug ("esra-omer") drives the calendar identifiers and filename, so
  // a fork inherits correct, unique values just by editing the names.
  const slug = `${slugify(w.bride)}-${slugify(w.groom)}`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${slug}//wedding//TR`,
    'BEGIN:VEVENT',
    `UID:${icsStamp(w.dateISO)}-${slug}@wedding`,
    `DTSTAMP:${icsStamp(w.dateISO)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${w.bride} & ${w.groom} — Düğün`,
    `DESCRIPTION:${w.bride} & ${w.groom}'in düğününe davetlisiniz.`,
    `LOCATION:${locationText}`,
  ]
  // Anchor the map pin on the exact venue coordinates. Without GEO, Apple
  // Calendar geocodes the address text and drops the pin on the wrong block.
  const geo = w.venue.geo
  if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
    lines.push(`GEO:${geo.lat};${geo.lng}`)
    lines.push(
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=${icsParam(locationText)};` +
        `X-APPLE-RADIUS=72;X-TITLE=${icsParam(w.venue.name)}:geo:${geo.lat},${geo.lng}`
    )
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  const ics = lines.join('\r\n')
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `inline; filename="${slug}-dugun.ics"`)
  res.send(ics)
})

app.use('/api/rsvp', rsvpRouter)
app.use('/api/posts', postsRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/games', gamesRouter)
app.use('/api/site', siteRouter)
app.use('/api/scores', scoresRouter)
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: storage.name }))

// In production, serve the built SPA and fall back to index.html for routing.
// index.html goes through the meta injector so the social/link-preview tags
// reflect the admin-edited site content (title, domain) without a rebuild.
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  const serveIndex = createIndexHandler(dist, () => storage.getDoc('site_content'))
  // index:false so "/" falls through to the injected handler below.
  app.use(express.static(dist, { index: false }))
  app.get('*', serveIndex)
}

// Central error handler so a failed storage call returns 500, not a hang.
app.use((err, _req, res, _next) => {
  console.error('[api error]', err)
  res.status(500).json({ error: 'internal error' })
})

// Last-resort backstops: a stray rejection or a stream error escaping a handler
// must not take down all ~100 guests' connections mid-event. Every request is
// stateless (JSON in S3), so logging and staying up is strictly better here
// than crashing and dropping every in-flight upload.
process.on('unhandledRejection', (err) => {
  console.error('[unhandled rejection]', err)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaught exception]', err)
})

app.listen(PORT, () => {
  console.log(`API + static server on http://localhost:${PORT}`)
})
