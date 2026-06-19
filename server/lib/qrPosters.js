// Index of the QR posters the couple has generated from the admin "QR Oluştur"
// tab (table cards + entrance signs). The poster PNGs themselves are stored as
// normal uploads (one fixed folder, see routes/adminQr.js), which gives them a
// stable /media URL plus serving and soft-delete for free. This lightweight
// collection is just the gallery index so the admin can list every saved poster
// newest-first and re-download it forever — mirrors lib/publicAlbum.js.
//
// Storage-agnostic: only getCollection/saveCollection are used, so the local
// and S3 drivers both work unchanged.
import { storage } from '../storage/index.js'

const NAME = 'qr_posters'

// One entry per saved poster:
//   { id, slug, type, label, url, createdAt }
// `id` is the upload file id; `slug` is its folder (for soft-delete); `type` is
// 'table' | 'entrance'; `createdAt` drives the newest-first gallery order.

async function readAll() {
  return (await storage.getCollection(NAME)) || []
}

// Saved posters, newest first.
export async function listPosters() {
  const items = await readAll()
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

// Serialize every read-modify-write so two near-simultaneous saves can't clobber
// each other (the admin can fire a save while a previous one is still settling).
let lock = Promise.resolve()
function withLock(fn) {
  const run = lock.then(fn, fn)
  lock = run.then(
    () => {},
    () => {},
  )
  return run
}

// Append a poster to the index. `createdAt` is stamped here so the route doesn't
// have to.
export function addPoster(entry) {
  return withLock(async () => {
    const items = await readAll()
    const saved = { ...entry, createdAt: new Date().toISOString() }
    items.push(saved)
    await storage.saveCollection(NAME, items)
    return saved
  })
}

// Remove a poster from the index by id; returns the removed entry (so the route
// knows which folder slug to soft-delete) or null when it wasn't found.
export function removePoster(id) {
  return withLock(async () => {
    const items = await readAll()
    const found = items.find((e) => e.id === id) || null
    if (found) await storage.saveCollection(NAME, items.filter((e) => e.id !== id))
    return found
  })
}
