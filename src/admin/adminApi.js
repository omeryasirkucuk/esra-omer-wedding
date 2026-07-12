// Admin API client. All calls hit the same origin (VITE_API_BASE is empty in
// production; useful only when the API is served from another host in dev).
// The bearer token lives in localStorage and is attached to every request
// except login. A 401 throws an AuthError so the shell can drop back to login.

const BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'eo_admin_token'

// Special error so callers can distinguish "session expired" from other faults.
export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthed() {
  return Boolean(getToken())
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

// Prefix a server-relative media path ("/media/...") with the API base so it
// resolves when the API lives on another origin.
export function mediaUrl(path) {
  if (!path) return ''
  return `${BASE}${path}`
}

// Small cached-thumbnail URL for a stored poster, parsed from its "/media/<slug>/<file>"
// path. The gallery shows these tiny WebPs instead of the multi-megabyte full-res
// export PNGs (the download keeps the original). Same endpoint the album uses.
export function posterThumbUrl(path) {
  const parts = String(path || '').split('/') // ["", "media", "<slug>", "<file>"]
  const slug = parts[2] || ''
  const file = parts[3] || ''
  if (!slug || !file) return mediaUrl(path)
  return `${BASE}/api/uploads/thumb?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(file)}`
}

async function request(method, path, body) {
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    logout()
    throw new AuthError()
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

const get = (path) => request('GET', path)
const post = (path, body) => request('POST', path, body)
const put = (path, body) => request('PUT', path, body)

// Login is the only call without a token; it stores the token on success.
export async function login(username, password) {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (res.status === 401) throw new AuthError('Invalid credentials')
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

// Endpoint wrappers ---------------------------------------------------------

export const getOverview = () => get('/api/admin/overview')

export const getRsvps = () => get('/api/admin/rsvps')

// Create a new attendance entry. Returns the created record (with `id`).
export const addRsvp = (payload) => post('/api/admin/rsvps', payload)

// Patch an existing entry. Pass `id` plus any subset of editable fields.
export const updateRsvp = (payload) => post('/api/admin/rsvps/update', payload)

// Remove an entry by id. Resolves to null (204 No Content).
export const deleteRsvp = (id) => post('/api/admin/rsvps/delete', { id })

// "Hediye" tab: the wedding gift ledger (one record per gift item) plus the
// hand-entered conversion rates ({ usdTry, eurTry, gold24Try, gold22Try,
// gold14Try }, TL each).
export const getGifts = () => get('/api/admin/gifts')
export const addGift = (payload) => post('/api/admin/gifts', payload)
export const updateGift = (payload) => post('/api/admin/gifts/update', payload)
export const deleteGift = (id) => post('/api/admin/gifts/delete', { id })
export const getGiftSettings = () => get('/api/admin/gifts/settings')
export const saveGiftSettings = (payload) => put('/api/admin/gifts/settings', payload)

export const getUploaders = () => get('/api/admin/uploaders')

export const deleteUpload = (slug, id) => post('/api/admin/uploads/delete', { slug, id })

// Promote/demote any guest's upload to the shared public album.
export const setUploadPublic = (slug, id, isPublic) =>
  post('/api/admin/uploads/public', { slug, id, public: isPublic })

export const getPosts = () => get('/api/admin/posts')

export const deletePost = (id) => post('/api/admin/posts/delete', { id })

export const getGamesContent = () => get('/api/admin/games-content')

export const saveGamesContent = (payload) => put('/api/admin/games-content', payload)

// Everything visible on the guest site (names, date, venue, program, families).
export const getSiteContent = () => get('/api/admin/site-content')

export const saveSiteContent = (payload) => put('/api/admin/site-content', payload)

// Open/close the wedding-day surfaces (hub, board, games, album). When closed
// the guest site shows only the invitation.
export const setSiteOpen = (open) => put('/api/admin/site-open', { open })

// Same-origin URL that streams one stored album file. Used both for direct
// downloads and to fetch the bytes for the mobile share sheet. The token rides
// in the query string because downloads/navigations can't set headers.
export function fileDownloadUrl(slug, item) {
  const q = new URLSearchParams({
    token: getToken() || '',
    slug,
    file: item.storedName,
    name: item.originalName || item.storedName,
    type: item.mime || '',
  })
  return `${BASE}/api/admin/uploads/download?${q.toString()}`
}

// Same-origin URL that streams the selected media as one ZIP (desktop). `items`
// is [{slug, id}]; the token rides in the query string for the same reason.
export function selectedZipUrl(items) {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(items)))) // base64 of UTF-8
  const q = new URLSearchParams({ token: getToken() || '', items: payload })
  return `${BASE}/api/admin/uploads/download-zip?${q.toString()}`
}

// Game scoreboard (who played what, the result, and per-game detail).
export const getScores = () => get('/api/admin/scores')
export const deleteScore = (id) => post('/api/admin/scores/delete', { id })

// Shared multipart upload helper (game photos, music, OG image).
async function uploadFile(path, file) {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (res.status === 401) {
    logout()
    throw new AuthError()
  }
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

// Upload an image for use inside the games. Returns { url, type }.
export const uploadPhoto = (file) => uploadFile('/api/admin/photos', file)

// System tab: deployment config snapshot (storage, music/OG status, masked
// secrets) and the explicit per-key plaintext reveal.
export const getSystemInfo = () => get('/api/admin/system')
export const revealSecret = (key) => post('/api/admin/system/reveal', { key })

// Admin accounts managed from the System tab. Every mutation carries the
// requesting admin's current password (verified server-side).
export const addAdminUser = (currentPassword, username, password) =>
  post('/api/admin/admin-users', { currentPassword, username, password })
export const setAdminPassword = (currentPassword, username, password) =>
  post('/api/admin/admin-users/password', { currentPassword, username, password })
export const deleteAdminUser = (currentPassword, username) =>
  post('/api/admin/admin-users/delete', { currentPassword, username })

// Invitation music: upload replaces the streamed file; delete falls back to
// the bundled one (when present).
export const uploadMusic = (file) => uploadFile('/api/admin/music', file)
export const deleteMusic = () => request('DELETE', '/api/admin/music')

// Link-preview (OG) image shown by WhatsApp/social when the site is shared.
export const uploadOgImage = (file) => uploadFile('/api/admin/og-image', file)
export const deleteOgImage = () => request('DELETE', '/api/admin/og-image')

// QR posters ("QR Oluştur" tab). The PNG is rendered client-side and uploaded
// here; the server stores it and returns the gallery entry. Saved posters stay
// until the couple deletes one.
export const getQrPosters = () => get('/api/admin/qr-posters')

// Remembered generator form values (titles, address, date, …) so the couple
// doesn't retype them. Shape is client-defined: { table, guest, entrance }.
export const getQrContent = () => get('/api/admin/qr-content')
export const saveQrContent = (payload) => put('/api/admin/qr-content', payload)

// `blob` is the rendered PNG; `type` is 'table' | 'entrance'; `label` is a short
// human title for the gallery. Returns the saved entry { id, type, label, url, … }.
export async function uploadQrPoster(blob, { type, label }) {
  const token = getToken()
  const form = new FormData()
  form.append('file', blob, 'poster.png')
  form.append('type', type)
  form.append('label', label || '')
  const res = await fetch(`${BASE}/api/admin/qr-posters`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (res.status === 401) {
    logout()
    throw new AuthError()
  }
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export const deleteQrPoster = (id) => request('DELETE', `/api/admin/qr-posters/${id}`)
