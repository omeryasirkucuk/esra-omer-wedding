// Admin credential configuration, read once from the environment. Lives in its
// own module so both the auth middleware (routes/admin.js) and the System tab
// endpoints (routes/adminSystem.js) share one source of truth — including the
// knowledge of whether the deployment still runs on the built-in defaults.

export const ADMIN_SECRET = process.env.ADMIN_SECRET || 'eo-wedding-admin-secret'
export const ADMIN_SECRET_FROM_ENV = Boolean(process.env.ADMIN_SECRET)
export const ADMIN_USERS_FROM_ENV = Boolean(process.env.ADMIN_USERS)

// Default accounts used when ADMIN_USERS is not set. A fork should override
// these via .env (ADMIN_USERS="user:pass,user:pass").
const DEFAULT_USERS = [
  { u: 'esra', p: 'omer' },
  { u: 'omer', p: 'esra' },
]

export function loadAdminUsers() {
  const raw = process.env.ADMIN_USERS
  if (raw) {
    return raw.split(',').map((pair) => {
      const [u, ...rest] = pair.split(':')
      return { u: u.trim(), p: rest.join(':').trim() }
    })
  }
  return DEFAULT_USERS
}

// The raw ADMIN_USERS value (env or the default literal) for the masked
// System-tab display and its explicit reveal action.
export function adminUsersValue() {
  return process.env.ADMIN_USERS || DEFAULT_USERS.map(({ u, p }) => `${u}:${p}`).join(',')
}
