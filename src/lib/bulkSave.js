// Bulk "Kaydet" for the guest album. Desktop gets one ZIP; phones/tablets get
// the native share sheet ("Save to Photos") in batches, because handing dozens
// of blobs to one share call risks running out of memory.
//
// iOS constraint that shapes the batching: navigator.share() only works within
// a fresh user gesture. So each batch is confirmed with an in-page "Devam Et"
// dialog (a real tap), and the NEXT batch's files are prefetched while the
// current share sheet / dialog is on screen — by the time the guest taps
// "Devam Et" the files are ready and share() fires inside the gesture window.
import { alertDialog, confirmDialog } from './confirm.js'
import { basename, isTouchDevice, mediaDownloadUrl } from './mediaActions.js'
import { runWithConcurrency } from './runWithConcurrency.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const BATCH_SIZE = 20
const FETCH_CONCURRENCY = 3

// "/media/<slug>/<file>" → the uploader folder slug, as in mediaDownloadUrl.
function slugFromUrl(url) {
  return String(url || '').split('/')[2] || ''
}

// ZIP of the selected items, streamed by the server (desktop path).
export function guestZipUrl(items) {
  const payload = items.map((item) => ({ slug: slugFromUrl(item.url), id: item.id }))
  const q = new URLSearchParams({ items: btoa(JSON.stringify(payload)) })
  return `${API_BASE}/api/uploads/download-zip?${q.toString()}`
}

function downloadZip(items) {
  const a = document.createElement('a')
  a.href = guestZipUrl(items)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Fetch one batch into File objects; failed fetches are skipped and counted.
async function fetchBatch(batch) {
  const files = []
  let failed = 0
  await runWithConcurrency(
    batch.map((item) => async () => {
      try {
        const res = await fetch(mediaDownloadUrl(item))
        if (!res.ok) throw new Error('fetch failed')
        const blob = await res.blob()
        const name = item.originalName || basename(item.url)
        files.push(new File([blob], name, { type: blob.type || item.mime || 'application/octet-stream' }))
      } catch {
        failed += 1
      }
    }),
    FETCH_CONCURRENCY,
  )
  return { files, failed }
}

// Save the given items on this device. Returns { saved, failed, aborted }:
// `aborted` means the guest dismissed the share sheet or tapped "Bitti".
export async function bulkSaveMedia(items) {
  if (!items.length) return { saved: 0, failed: 0, aborted: false }

  // Desktop (or no share support): one ZIP, one download.
  if (!isTouchDevice() || !navigator.canShare) {
    downloadZip(items)
    return { saved: items.length, failed: 0, aborted: false }
  }

  const batches = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE))
  }

  let saved = 0
  let failed = 0
  let nextFetch = fetchBatch(batches[0])

  for (let b = 0; b < batches.length; b++) {
    const { files, failed: fetchFailed } = await nextFetch
    failed += fetchFailed

    // Start prefetching the following batch while the share sheet is open.
    if (b + 1 < batches.length) nextFetch = fetchBatch(batches[b + 1])

    if (files.length > 0) {
      try {
        if (!navigator.canShare({ files })) throw new Error('cannot share')
        await navigator.share({ files })
        saved += files.length
      } catch (e) {
        if (e && e.name === 'AbortError') return { saved, failed, aborted: true }
        // Share unavailable for these files → last resort, ZIP what remains.
        downloadZip(batches.slice(b).flat())
        return { saved: saved + batches.slice(b).flat().length, failed, aborted: false }
      }
    }

    if (b + 1 < batches.length) {
      const done = Math.min((b + 1) * BATCH_SIZE, items.length)
      const goOn = await confirmDialog(`${done}/${items.length} kaydedildi`, {
        okText: 'Devam Et',
        cancelText: 'Bitti',
      })
      if (!goOn) return { saved, failed, aborted: true }
    }
  }

  if (failed > 0) await alertDialog(`${failed} dosya kaydedilemedi`)
  return { saved, failed, aborted: false }
}
