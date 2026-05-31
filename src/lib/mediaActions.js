// Save one photo/video the easy way. On phones/tablets we hand the file to the
// native share sheet (which includes "Save to Photos" and share-to-app); on
// desktop we download it. Mirrors the bulk-download approach used in the admin
// album, but for a single item.

// A Mac reports canShare({files}) too, but its sheet has no "save to disk", so
// anything that isn't a touch device takes the download path.
function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1
}

// Last path segment of a media URL, used as a filename fallback.
export function basename(url) {
  return String(url || '').split('/').pop() || 'medya'
}

// Returns true when the file was handed off (shared or downloaded), false if the
// user dismissed the share sheet or it failed.
export async function saveMedia({ url, filename, mime }) {
  const name = filename || basename(url)
  let blob
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    blob = await res.blob()
  } catch {
    return false
  }

  if (isTouchDevice() && navigator.canShare) {
    try {
      const file = new File([blob], name, { type: blob.type || mime || 'application/octet-stream' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return true
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false // user dismissed the sheet
      // anything else → fall through to a plain download
    }
  }

  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
  return true
}
