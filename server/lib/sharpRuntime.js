// Process-level sharp configuration plus a gate on concurrent image decodes.
// Decoding a full-resolution phone photo (12–48 MP, often HEIC) allocates a raw
// bitmap of tens to hundreds of MB, so unbounded parallel sharp jobs can push
// the 512 MB instance past its memory limit (this OOM-killed the service once:
// two guests uploading photos at the same time fanned out to enough concurrent
// decodes to triple RSS in minutes). Every sharp user imports from here so the
// process-wide settings apply exactly once.
import sharp from 'sharp'

// libvips' operation cache trades retained memory for speed. Derivatives are
// generated once per file and then served from storage, so the cache never gets
// a hit worth its footprint — disable it so decode buffers return to the heap.
sharp.cache(false)
// One thread per libvips operation: derivative generation is background work
// and shouldn't compete with request handlers for CPU or per-thread buffers.
sharp.concurrency(1)

// At most this many full-resolution image decodes in flight; the rest queue.
// Clients now generate derivatives in the browser, so this pipeline only runs
// as a fallback (old cached bundles, undecodable formats) — a single slot
// keeps even a worst-case 48 MP decode plus baseline under the 512 MB limit.
const MAX_IMAGE_JOBS = 1

// Refuse pathologically large images in the fallback pipeline: a 200 MP
// original would allocate ~800 MB raw regardless of the job gate. 60 MP still
// admits every current phone camera; beyond that the caller falls back to
// serving the original.
export const FALLBACK_PIXEL_LIMIT = 60_000_000
let active = 0
const waiters = []

// Run fn() under the image-decode gate (FIFO queue when saturated).
export async function withImageJob(fn) {
  if (active < MAX_IMAGE_JOBS) active++
  else await new Promise((resolve) => waiters.push(resolve))
  try {
    return await fn()
  } finally {
    const next = waiters.shift()
    if (next) next() // hand the slot to the next waiter; `active` stays as-is
    else active--
  }
}

export default sharp
