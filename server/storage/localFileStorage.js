// Local filesystem implementation of the storage interface.
//
// Layout mirrors the S3 bucket exactly so the two drivers are interchangeable:
//
//   <STORAGE_DIR>/
//     rsvp.json
//     posts.json
//     uploads/<name-slug>-<id>/manifest.json
//     uploads/<name-slug>-<id>/<fileId>.<ext>
//
// The per-uploader subfolder + manifest is what lets the couple browse the
// bucket and see exactly who uploaded or deleted what.
import fs from 'node:fs'
import path from 'node:path'
import { slugify, mediaUrl } from './shared.js'

const ROOT = path.resolve(process.env.STORAGE_DIR || './data')
const UPLOADS_DIR = path.join(ROOT, 'uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

export const localStorageDriver = {
  name: 'local',

  async getCollection(name) {
    return readJson(path.join(ROOT, `${name}.json`), [])
  },
  async saveCollection(name, arr) {
    writeJson(path.join(ROOT, `${name}.json`), arr)
  },

  uploaderSlug(displayName, uploaderId) {
    return `${slugify(displayName)}-${uploaderId}`
  },

  // Find the existing folder for a device id (slug ends with "-<id>").
  async findSlug(uploaderId) {
    try {
      for (const slug of fs.readdirSync(UPLOADS_DIR)) {
        if (slug.endsWith(`-${uploaderId}`)) return slug
      }
    } catch {
      /* none yet */
    }
    return null
  },

  async putUpload({ displayName, uploaderId, firstName, lastName, tempPath, fileId, ext, originalName, mime, size }) {
    const slug = this.uploaderSlug(displayName, uploaderId)
    const dir = path.join(UPLOADS_DIR, slug)
    fs.mkdirSync(dir, { recursive: true })
    const storedName = `${fileId}${ext}`
    fs.renameSync(tempPath, path.join(dir, storedName))

    const manifestPath = path.join(dir, 'manifest.json')
    const manifest = readJson(manifestPath, { uploaderId, displayName, firstName, lastName, items: [] })
    const item = {
      id: fileId,
      originalName,
      storedName,
      mime,
      type: mime.startsWith('video') ? 'video' : 'image',
      size,
      url: mediaUrl(slug, storedName),
      uploadedAt: new Date().toISOString(),
      deleted: false,
    }
    manifest.items.push(item)
    writeJson(manifestPath, manifest)
    return item
  },

  async getUploads(uploaderId) {
    const slug = await this.findSlug(uploaderId)
    if (!slug) return []
    const manifest = readJson(path.join(UPLOADS_DIR, slug, 'manifest.json'), null)
    if (!manifest) return []
    return manifest.items
      .filter((i) => !i.deleted)
      .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
  },

  async softDeleteUpload({ uploaderId, displayName, id }) {
    const slug = this.uploaderSlug(displayName, uploaderId)
    const manifestPath = path.join(UPLOADS_DIR, slug, 'manifest.json')
    const manifest = readJson(manifestPath, null)
    if (!manifest) return false
    const item = manifest.items.find((i) => i.id === id)
    if (!item) return false
    item.deleted = true
    item.deletedAt = new Date().toISOString()
    writeJson(manifestPath, manifest)
    return true
  },

  // Key/value JSON document (object), e.g. editable game content.
  async getDoc(name) {
    return readJson(path.join(ROOT, `${name}.json`), {})
  },
  async saveDoc(name, obj) {
    writeJson(path.join(ROOT, `${name}.json`), obj)
  },

  // Admin: every uploader folder with its manifest items.
  async listAllUploads() {
    const out = []
    let slugs = []
    try {
      slugs = fs.readdirSync(UPLOADS_DIR)
    } catch {
      /* none yet */
    }
    for (const slug of slugs) {
      const m = readJson(path.join(UPLOADS_DIR, slug, 'manifest.json'), null)
      if (m) out.push({ slug, displayName: m.displayName, uploaderId: m.uploaderId, items: m.items || [] })
    }
    return out
  },

  // Admin: soft-delete an item addressed directly by folder slug.
  async softDeleteBySlug(slug, id) {
    const manifestPath = path.join(UPLOADS_DIR, slug, 'manifest.json')
    const manifest = readJson(manifestPath, null)
    if (!manifest) return false
    const item = manifest.items.find((i) => i.id === id)
    if (!item) return false
    item.deleted = true
    item.deletedAt = new Date().toISOString()
    writeJson(manifestPath, manifest)
    return true
  },

  // Raw readable stream for one stored upload. Used by the admin "download
  // selected" zip so files never round-trip through the browser.
  async readStream(slug, storedName) {
    return fs.createReadStream(path.join(UPLOADS_DIR, slug, storedName))
  },

  // No presigning locally; the music falls back to a file in public/music.
  async signKey() {
    return null
  },

  // Serves /media/<slug>/<file> straight from disk.
  mediaHandler(req, res) {
    const rel = req.params[0] || ''
    const full = path.join(UPLOADS_DIR, rel)
    if (!full.startsWith(UPLOADS_DIR)) return res.status(400).end()
    res.sendFile(full, (err) => {
      if (err) res.status(404).end()
    })
  },
}
