// Lightweight, login-free guest identity.
//
// Access to "my uploads / my posts" is keyed by a random per-device id stored
// in localStorage — NOT by name. So two guests both named "Ayşe" never collide:
// different devices -> different ids -> separate folders. The name is only a
// human label; the server appends a short id slug for the couple's benefit.
//
// The id and name are remembered, so the site never re-asks on refresh.

const ID_KEY = 'eo_uploader_id'
const NAME_KEY = 'eo_uploader_name'

function randomId() {
  // 8 url-safe chars, enough to disambiguate ~hundreds of guests.
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 8)
}

export function getUploaderId() {
  let id = localStorage.getItem(ID_KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(ID_KEY, id)
  }
  return id
}

export function getProfile() {
  const raw = localStorage.getItem(NAME_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveProfile({ firstName, lastName }) {
  // Surname is optional: with one, the display name is "Ayşe K."; without it,
  // just "Ayşe".
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const profile = {
    firstName: first,
    lastName: last,
    displayName: last ? `${first} ${last.charAt(0).toUpperCase()}.` : first,
  }
  localStorage.setItem(NAME_KEY, JSON.stringify(profile))
  window.dispatchEvent(new Event('eo-profile')) // let listeners (ProfileChip) update live
  return profile
}

export function clearProfile() {
  localStorage.removeItem(NAME_KEY)
  window.dispatchEvent(new Event('eo-profile'))
}

export function hasProfile() {
  return !!getProfile()
}
