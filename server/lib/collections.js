// Serialized, lightly cached access to the shared JSON collections (posts,
// scores, rsvp, public_album). Two problems this solves for a single busy day:
//
//  • Lost writes: S3 has no atomic update, so two concurrent read→modify→write
//    cycles on the same collection clobber each other (a like and a new post
//    landing together silently drops one). Every mutation goes through a
//    per-collection lock that runs full cycles one at a time.
//  • Poll amplification: the Pano and the public album are polled every few
//    seconds by every guest; without a cache each poll is a fresh S3 GET +
//    parse. A short TTL cache turns ~45 reads/sec into a handful, and writes
//    refresh the cache in place so a guest's own action is visible immediately.
import { storage } from '../storage/index.js'
import { makeWriteLock } from '../storage/shared.js'

const locks = new Map()
function lockFor(name) {
  let lock = locks.get(name)
  if (!lock) {
    lock = makeWriteLock()
    locks.set(name, lock)
  }
  return lock
}

const CACHE_TTL_MS = 2500
const cache = new Map() // name → { at, data }

// Cached read for hot, polled endpoints. Callers must not mutate the returned
// array in place (filter/sort-into-a-copy is fine) — mutations go through
// updateCollection so they hold the lock and refresh the cache.
export async function readCollection(name) {
  const hit = cache.get(name)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  const data = await storage.getCollection(name)
  cache.set(name, { at: Date.now(), data })
  return data
}

// Run one full read→modify→write cycle under the collection's lock. `mutate`
// receives the freshly read array, edits it in place (or reads from it), and
// its return value is passed through to the caller. The updated array is
// always saved and becomes the new cached value.
export function updateCollection(name, mutate) {
  return lockFor(name)(async () => {
    const arr = await storage.getCollection(name)
    const result = await mutate(arr)
    await storage.saveCollection(name, arr)
    cache.set(name, { at: Date.now(), data: arr })
    return result
  })
}

// Same locking, for mutations that replace the array instead of editing it
// (e.g. delete-by-filter). `derive` returns the next array to save.
export function replaceCollection(name, derive) {
  return lockFor(name)(async () => {
    const arr = await storage.getCollection(name)
    const next = await derive(arr)
    await storage.saveCollection(name, next)
    cache.set(name, { at: Date.now(), data: next })
    return next
  })
}
