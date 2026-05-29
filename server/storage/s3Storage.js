// Amazon S3 implementation of the storage interface. Same shape as the local
// driver, so switching is just STORAGE_DRIVER=s3.
//
// Bucket layout (identical to local):
//   rsvp.json
//   posts.json
//   uploads/<name-slug>-<id>/manifest.json
//   uploads/<name-slug>-<id>/<fileId>.<ext>
//
// Files stream up via @aws-sdk/lib-storage (multipart, so large videos never
// load fully into memory). The bucket can stay fully private: media is served
// through the /media route which 302-redirects to a short-lived presigned URL,
// so stored URLs never expire.
import fs from 'node:fs'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { slugify, mediaUrl } from './shared.js'

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION || 'eu-central-1'
const client = new S3Client({ region: REGION })

async function readJsonKey(key, fallback) {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return JSON.parse(await res.Body.transformToString())
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return fallback
    throw err
  }
}
async function writeJsonKey(key, data) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    }),
  )
}

export const s3StorageDriver = {
  name: 's3',

  async getCollection(name) {
    return readJsonKey(`${name}.json`, [])
  },
  async saveCollection(name, arr) {
    await writeJsonKey(`${name}.json`, arr)
  },

  uploaderSlug(displayName, uploaderId) {
    return `${slugify(displayName)}-${uploaderId}`
  },

  // List folder prefixes under uploads/ and match the one ending "-<id>".
  async findSlug(uploaderId) {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'uploads/', Delimiter: '/' }),
    )
    for (const p of res.CommonPrefixes || []) {
      const slug = p.Prefix.replace(/^uploads\//, '').replace(/\/$/, '')
      if (slug.endsWith(`-${uploaderId}`)) return slug
    }
    return null
  },

  async putUpload({ displayName, uploaderId, firstName, lastName, tempPath, fileId, ext, originalName, mime, size }) {
    const slug = this.uploaderSlug(displayName, uploaderId)
    const storedName = `${fileId}${ext}`
    const key = `uploads/${slug}/${storedName}`

    await new Upload({
      client,
      params: { Bucket: BUCKET, Key: key, Body: fs.createReadStream(tempPath), ContentType: mime },
    }).done()
    fs.unlink(tempPath, () => {})

    const manifestKey = `uploads/${slug}/manifest.json`
    const manifest = await readJsonKey(manifestKey, { uploaderId, displayName, firstName, lastName, items: [] })
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
    await writeJsonKey(manifestKey, manifest)
    return item
  },

  async getUploads(uploaderId) {
    const slug = await this.findSlug(uploaderId)
    if (!slug) return []
    const manifest = await readJsonKey(`uploads/${slug}/manifest.json`, null)
    if (!manifest) return []
    return manifest.items
      .filter((i) => !i.deleted)
      .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
  },

  async softDeleteUpload({ uploaderId, displayName, id }) {
    const slug = this.uploaderSlug(displayName, uploaderId)
    const manifestKey = `uploads/${slug}/manifest.json`
    const manifest = await readJsonKey(manifestKey, null)
    if (!manifest) return false
    const item = manifest.items.find((i) => i.id === id)
    if (!item) return false
    item.deleted = true
    item.deletedAt = new Date().toISOString()
    await writeJsonKey(manifestKey, manifest)
    return true
  },

  // Key/value JSON document (object), e.g. editable game content.
  async getDoc(name) {
    return readJsonKey(`${name}.json`, {})
  },
  async saveDoc(name, obj) {
    await writeJsonKey(`${name}.json`, obj)
  },

  // Admin: every uploader folder with its manifest items.
  async listAllUploads() {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'uploads/', Delimiter: '/' }),
    )
    const out = []
    for (const p of res.CommonPrefixes || []) {
      const slug = p.Prefix.replace(/^uploads\//, '').replace(/\/$/, '')
      const m = await readJsonKey(`uploads/${slug}/manifest.json`, null)
      if (m) out.push({ slug, displayName: m.displayName, uploaderId: m.uploaderId, items: m.items || [] })
    }
    return out
  },

  // Admin: soft-delete an item addressed directly by folder slug.
  async softDeleteBySlug(slug, id) {
    const key = `uploads/${slug}/manifest.json`
    const manifest = await readJsonKey(key, null)
    if (!manifest) return false
    const item = manifest.items.find((i) => i.id === id)
    if (!item) return false
    item.deleted = true
    item.deletedAt = new Date().toISOString()
    await writeJsonKey(key, manifest)
    return true
  },

  // Presign any bucket key (used for the invitation music).
  async signKey(key) {
    return getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
      expiresIn: 3600,
    })
  },

  // Redirect /media/<slug>/<file> to a short-lived presigned GET URL.
  async mediaHandler(req, res) {
    const rel = req.params[0] || ''
    try {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: BUCKET, Key: `uploads/${rel}` }),
        { expiresIn: 3600 },
      )
      res.redirect(302, url)
    } catch {
      res.status(404).end()
    }
  },
}
