// The shared "Düğün Albümü" index.
//
// Album uploads stay private-per-uploader (one manifest.json per device folder).
// To let guests see each other's photos we keep a single lightweight collection,
// `public_album`, that lists exactly the items a guest (or the admin) has chosen
// to make public. It mirrors the Pano's `posts.json` model: the public gallery
// polls it live, so it must be cheap to read — one small JSON, never a scan of
// every uploader's manifest.
//
// This module is the single source of truth for "is this item public". It is
// storage-agnostic: it only uses the generic getCollection/saveCollection, so
// both the local and S3 drivers work unchanged.
import { readCollection, replaceCollection } from './collections.js'
import { isReservedUploader } from './reservedUploaders.js'

const NAME = 'public_album'

// One entry per shared upload.
//   { id, slug, url, type, uploadedAt, uploaderId, displayName, lqip?, sharedAt }
// `id` is the upload's file id (unique across the site); `sharedAt` drives the
// newest-first order in the public gallery.

async function readAll() {
  return (await readCollection(NAME)) || []
}

// Public items, newest-shared first. Sanitized for the guest gallery elsewhere.
// Reserved uploads (game images, QR posters) are filtered out even if one was
// previously promoted, so the guest album self-heals with no manual cleanup.
export async function listPublic() {
  const items = (await readAll()).filter((e) => !isReservedUploader(e.uploaderId))
  return items.sort((a, b) => Date.parse(b.sharedAt) - Date.parse(a.sharedAt))
}

// Set of public item ids — used to annotate "my uploads" / the admin list with a
// `public` flag without a second round-trip.
export async function publicIdSet() {
  return new Set((await readAll()).map((e) => e.id))
}

// Read-modify-write cycles go through lib/collections.js, which serializes them
// per collection. Bulk "add to album" sends one request per photo in parallel,
// and at the wedding many guests share at once; without that lock the concurrent
// cycles clobber each other and silently drop entries.

// Add (or refresh) a public entry. Idempotent on `id`. Reserved uploads (game
// images, QR posters) are never shareable, so ignore them defensively.
export function addPublic(entry) {
  if (isReservedUploader(entry.uploaderId)) return Promise.resolve()
  return replaceCollection(NAME, (items) => {
    const rest = items.filter((e) => e.id !== entry.id)
    rest.push({ ...entry, sharedAt: new Date().toISOString() })
    return rest
  })
}

// Remove a public entry by upload id. Safe to call when it isn't public.
export function removePublic(id) {
  return replaceCollection(NAME, (items) => items.filter((e) => e.id !== id))
}
