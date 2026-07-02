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

const API_BASE = import.meta.env.VITE_API_BASE || ''

const VIDEO_URL_EXT = /\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/i

// Treat an item as a video by its stored type or, as a fallback, its file
// extension — some browsers upload videos with a generic mime, which would
// otherwise misclassify them as images.
export function isVideoItem(item) {
  const t = item?.type
  return t === 'video' || (typeof t === 'string' && t.startsWith('video')) || VIDEO_URL_EXT.test(item?.url || '')
}

// Last path segment of a media URL, used as a filename fallback.
export function basename(url) {
  return String(url || '').split('/').pop() || 'medya'
}

// Same-origin, range-capable URL for inline video playback (avoids the S3
// presigned-redirect churn that makes <video> flaky on iOS).
export function streamUrl(item) {
  const parts = String(item?.url || '').split('/')
  const slug = parts[2] || ''
  const file = parts[3] || ''
  return `${API_BASE}/api/uploads/stream?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(file)}`
}

// Small cached-thumbnail URL for grid display. Parses the "/media/<slug>/<file>"
// path the same way as the save URL. `w` (250 or 500) picks the cached width so
// a dense phone grid can pull the smaller asset via srcset; omitting it serves
// the 500 px default. Only used for images; video tiles show a placeholder.
export function thumbUrl(item, w) {
  const parts = String(item?.url || '').split('/')
  const slug = parts[2] || ''
  const file = parts[3] || ''
  const width = w ? `&w=${w}` : ''
  return `${API_BASE}/api/uploads/thumb?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(file)}${width}`
}

// Resolution-capped, same-origin URL for displaying a game photo. Parses the
// "/media/<slug>/<file>" path like thumbUrl, but points at the larger /display
// derivative so every guest sees the same bounded quality regardless of the
// original the admin uploaded. Falls back to the raw url if it isn't a /media path.
export function displayUrl(url) {
  const parts = String(url || '').split('/')
  if (parts[1] !== 'media' || !parts[2] || !parts[3]) return url || ''
  const slug = parts[2]
  const file = parts[3]
  return `${API_BASE}/api/uploads/display?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(file)}`
}

// Same-origin streaming URL for saving an item. The display URL ("/media/...")
// 302-redirects to a presigned S3 URL in production, which fetch() cannot read
// into a blob without S3 CORS; "/api/uploads/file" streams the bytes through our
// own server instead, so save/share works on every device and storage driver.
export function mediaDownloadUrl(item) {
  const parts = String(item?.url || '').split('/') // ["", "media", "<slug>", "<storedName>"]
  const slug = parts[2] || ''
  const file = parts[3] || ''
  const q = new URLSearchParams({
    slug,
    file,
    name: item?.originalName || file,
    type: item?.mime || '',
  })
  return `${API_BASE}/api/uploads/file?${q.toString()}`
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
