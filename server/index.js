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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.API_PORT || 8787
const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Uploaded media: resolved by the active storage driver (disk file locally,
// presigned redirect on S3). Stored URLs are stable and never expire.
app.get('/media/*', (req, res) => storage.mediaHandler(req, res))

app.use('/api/rsvp', rsvpRouter)
app.use('/api/posts', postsRouter)
app.use('/api/uploads', uploadsRouter)
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
