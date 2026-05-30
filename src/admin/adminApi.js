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

export const getUploaders = () => get('/api/admin/uploaders')

export const deleteUpload = (slug, id) => post('/api/admin/uploads/delete', { slug, id })

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

// Game scoreboard (who played what, the result, and per-game detail).
export const getScores = () => get('/api/admin/scores')
export const deleteScore = (id) => post('/api/admin/scores/delete', { id })

// Upload an image for use inside the games. Returns { url, type }.
export async function uploadPhoto(file) {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/api/admin/photos`, {
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
