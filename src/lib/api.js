// Thin API client. Base URL is empty for same-origin (local full-stack);
// set VITE_API_BASE when the front-end is hosted apart from the API.
import { getUploaderId, getProfile } from './identity'

const BASE = import.meta.env.VITE_API_BASE || ''

function authParams() {
  const profile = getProfile()
  return {
    uploaderId: getUploaderId(),
    displayName: profile?.displayName || 'Misafir',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
  }
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`)
  return res.status === 204 ? null : res.json()
}

export const api = {
  base: BASE,
  // Editable game content (quiz, etc.); empty object when nothing saved yet.
  getGamesContent: () => json('GET', '/api/games/content'),
  // Editable site content (names, date, venue, program…); {} when unset.
  getSiteContent: () => json('GET', '/api/site/content'),

  // Game scoreboard
  getScores: () => json('GET', '/api/scores'),
  submitScore: ({ game, score, label, detail }) =>
    json('POST', '/api/scores', { ...authParams(), game, score, label, detail }),

  // RSVP
  sendRsvp: (payload) => json('POST', '/api/rsvp', payload),

  // Memory board posts
  listPosts: (since) => json('GET', `/api/posts${since ? `?since=${since}` : ''}`),
  createPost: (payload) => json('POST', '/api/posts', { ...authParams(), ...payload }),
  likePost: (id) => json('POST', `/api/posts/${id}/like`, authParams()),
  deletePost: (id) => json('POST', `/api/posts/${id}/delete`, authParams()),

  // Album uploads
  listMyUploads: () => {
    const { uploaderId } = authParams()
    return json('GET', `/api/uploads?uploaderId=${encodeURIComponent(uploaderId)}`)
  },
  deleteUpload: (id) => json('POST', `/api/uploads/${id}/delete`, authParams()),

  // Shared "Düğün Albümü": the photos guests have made public.
  listPublicUploads: () => json('GET', '/api/uploads/public'),
  // Promote/demote one of my own uploads to/from the public album.
  setUploadPublic: (id, isPublic) =>
    json('POST', `/api/uploads/${id}/public`, { ...authParams(), public: isPublic }),

  // Returns a configured XHR-based uploader for a single file with progress.
  uploadFile(file, { onProgress } = {}) {
    const { uploaderId, displayName, firstName, lastName } = authParams()
    const form = new FormData()
    form.append('uploaderId', uploaderId)
    form.append('displayName', displayName)
    form.append('firstName', firstName)
    form.append('lastName', lastName)
    form.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/api/uploads`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
        else reject(new Error(`upload failed: ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('upload network error'))
      xhr.send(form)
    })
  },
}
