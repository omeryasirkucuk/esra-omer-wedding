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

  // All folders for a device id (slug ends with "-<id>"). A guest can end up
  // with more than one if they renamed their profile between uploads, since the
  // slug embeds the display name — so every read must consider all of them.
  async findSlugs(uploaderId) {
    const out = []
    try {
      for (const slug of fs.readdirSync(UPLOADS_DIR)) {
        if (slug.endsWith(`-${uploaderId}`)) out.push(slug)
      }
    } catch {
      /* none yet */
    }
    return out
  },

  async putUpload({ displayName, uploaderId, firstName, lastName, tempPath, fileId, ext, originalName, mime, size, lqip }) {
    // Reuse this device's existing folder if it has one (so a later rename
    // doesn't scatter the guest's media across folders); otherwise create one.
    const existing = await this.findSlugs(uploaderId)
    const slug = existing[0] || this.uploaderSlug(displayName, uploaderId)
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
      ...(lqip ? { lqip } : {}),
    }
    manifest.items.push(item)
    writeJson(manifestPath, manifest)
    return item
  },

  async getUploads(uploaderId) {
    const items = []
    for (const slug of await this.findSlugs(uploaderId)) {
      const manifest = readJson(path.join(UPLOADS_DIR, slug, 'manifest.json'), null)
      if (manifest) items.push(...manifest.items)
    }
    return items
      .filter((i) => !i.deleted)
      .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
  },

  // Soft-delete by id across all of this device's folders (the item may live in
  // an older, differently-named folder than the current display name implies).
  async softDeleteUpload({ uploaderId, id }) {
    for (const slug of await this.findSlugs(uploaderId)) {
      const manifestPath = path.join(UPLOADS_DIR, slug, 'manifest.json')
      const manifest = readJson(manifestPath, null)
      const item = manifest?.items.find((i) => i.id === id)
      if (item) {
        item.deleted = true
        item.deletedAt = new Date().toISOString()
        writeJson(manifestPath, manifest)
        return true
      }
    }
    return false
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

  // True when a file exists — used to serve a cached thumbnail derivative.
  async hasFile(slug, name) {
    return fs.existsSync(path.join(UPLOADS_DIR, slug, name))
  },

  // Write a small derivative (e.g. a thumbnail) next to the original.
  async putBytes(slug, name, buffer) {
    const dir = path.join(UPLOADS_DIR, slug)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), buffer)
  },

  // No presigning locally; the music falls back to a file in public/music.
  async signKey() {
    return null
  },

  // --- Generic single objects (invitation music, OG image) -----------------
  // Keys live directly under the storage root, mirroring the S3 bucket layout
  // (e.g. "music/davetiye-music.mp3", "site/og.png").

  // Resolve a key under ROOT with a path-traversal guard.
  objectPath(key) {
    const full = path.resolve(ROOT, key)
    if (!full.startsWith(ROOT)) throw new Error('invalid object key')
    return full
  },

  async objectInfo(key) {
    try {
      const stat = fs.statSync(this.objectPath(key))
      return { exists: true, size: stat.size, modifiedAt: stat.mtime.toISOString() }
    } catch {
      return { exists: false }
    }
  },

  async hasObject(key) {
    return (await this.objectInfo(key)).exists
  },

  // Move an uploaded temp file into place (copy+unlink so it also works when
  // the OS temp dir lives on another volume).
  async putObject(key, tempPath) {
    const full = this.objectPath(key)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    try {
      fs.renameSync(tempPath, full)
    } catch {
      fs.copyFileSync(tempPath, full)
      fs.unlink(tempPath, () => {})
    }
  },

  async deleteObject(key) {
    try {
      fs.unlinkSync(this.objectPath(key))
      return true
    } catch {
      return false
    }
  },

  // sendFile handles Range requests and MIME automatically.
  async streamObject(key, _req, res, contentType) {
    if (contentType) res.type(contentType)
    res.sendFile(this.objectPath(key), (err) => {
      if (err && !res.headersSent) res.status(404).end()
    })
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
