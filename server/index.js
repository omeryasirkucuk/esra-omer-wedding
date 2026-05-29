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
const MUSIC_KEY = process.env.MUSIC_KEY || 'music/davetiye-music.mp3'

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

app.get('/api/music', async (_req, res) => {
  try {
    const url = await storage.signKey(MUSIC_KEY)
    if (url) return res.redirect(302, url)
  } catch (err) {
    console.error('[music]', err)
  }
  // Local fallback (no S3): serve a file dropped in public/music if present.
  const local = path.join(dist, 'music', 'davetiye-music.mp3')
  if (fs.existsSync(local)) return res.sendFile(local)
  res.status(404).end()
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
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// Central error handler so a failed storage call returns 500, not a hang.
app.use((err, _req, res, _next) => {
  console.error('[api error]', err)
  res.status(500).json({ error: 'internal error' })
})

app.listen(PORT, () => {
  console.log(`API + static server on http://localhost:${PORT}`)
})
