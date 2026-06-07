// Storage-backed admin account management. When the couple defines accounts
// from the admin System tab, they are stored (scrypt-hashed) in the
// `admin_users` doc and take precedence over the env/default accounts from
// adminAuthConfig.js. Recovery from a forgotten password: delete
// admin_users.json from the storage (bucket or data dir) — the deployment then
// falls back to ADMIN_USERS / the built-in defaults.
import crypto from 'node:crypto'
import { storage } from '../storage/index.js'
import { loadAdminUsers as envUsers, ADMIN_USERS_FROM_ENV } from './adminAuthConfig.js'

const DOC = 'admin_users'

// Small cache so the auth middleware doesn't hit storage on every request.
const CACHE_TTL_MS = 10_000
let cached = null
let cachedAt = 0

async function storedUsers() {
  const now = Date.now()
  if (!cached || now - cachedAt > CACHE_TTL_MS) {
    try {
      const doc = await storage.getDoc(DOC)
      cached = Array.isArray(doc?.users) && doc.users.length ? doc.users : []
    } catch {
      cached = []
    }
    cachedAt = now
  }
  return cached
}

function invalidateCache() {
  cached = null
}

// --- Password hashing (scrypt, no external deps) ----------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

function verifyHash(password, { salt, hash }) {
  const candidate = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

// --- Queries -----------------------------------------------------------------

// 'stored' (managed from the admin) | 'env' (ADMIN_USERS) | 'default'
export async function usersSource() {
  if ((await storedUsers()).length) return 'stored'
  return ADMIN_USERS_FROM_ENV ? 'env' : 'default'
}

export async function listUsernames() {
  const stored = await storedUsers()
  if (stored.length) return stored.map((u) => u.u)
  return envUsers().map((u) => u.u)
}

export async function userExists(username) {
  return (await listUsernames()).includes(username)
}

export async function verifyCredentials(username, password) {
  const stored = await storedUsers()
  if (stored.length) {
    const found = stored.find((u) => u.u === username)
    return Boolean(found && verifyHash(password, found))
  }
  return envUsers().some((u) => u.u === username && u.p === password)
}

// --- Mutations ---------------------------------------------------------------
// The first mutation materializes the current env/default accounts into the
// stored doc (hashed), so the whole set stays consistent from then on.

async function materialize() {
  const stored = await storedUsers()
  if (stored.length) return [...stored]
  return envUsers().map(({ u, p }) => ({ u, ...hashPassword(p) }))
}

async function save(users) {
  await storage.saveDoc(DOC, { users, updatedAt: new Date().toISOString() })
  invalidateCache()
}

const cleanName = (v) => String(v || '').trim().slice(0, 40)

export async function setPassword(username, newPassword) {
  const users = await materialize()
  const found = users.find((u) => u.u === username)
  if (!found) return { error: 'user not found' }
  Object.assign(found, hashPassword(newPassword))
  await save(users)
  return { ok: true }
}

export async function addUser(username, password) {
  const name = cleanName(username)
  if (!name) return { error: 'username required' }
  const users = await materialize()
  if (users.some((u) => u.u === name)) return { error: 'user exists' }
  users.push({ u: name, ...hashPassword(password) })
  await save(users)
  return { ok: true }
}

export async function removeUser(username) {
  const users = await materialize()
  if (users.length <= 1) return { error: 'last user' }
  const next = users.filter((u) => u.u !== username)
  if (next.length === users.length) return { error: 'user not found' }
  await save(next)
  return { ok: true }
}
