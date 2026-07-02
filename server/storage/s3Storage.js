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
  HeadObjectCommand,
  DeleteObjectCommand,
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

  // All folder prefixes under uploads/ ending "-<id>". A guest can have more than
  // one if they renamed their profile between uploads (the slug embeds the name),
  // so every read must consider all of them.
  async findSlugs(uploaderId) {
    const out = []
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'uploads/', Delimiter: '/' }),
    )
    for (const p of res.CommonPrefixes || []) {
      const slug = p.Prefix.replace(/^uploads\//, '').replace(/\/$/, '')
      if (slug.endsWith(`-${uploaderId}`)) out.push(slug)
    }
    return out
  },

  async putUpload({ displayName, uploaderId, firstName, lastName, tempPath, fileId, ext, originalName, mime, size, lqip }) {
    // Reuse this device's existing folder if it has one (so a later rename
    // doesn't scatter the guest's media across folders); otherwise create one.
    const existing = await this.findSlugs(uploaderId)
    const slug = existing[0] || this.uploaderSlug(displayName, uploaderId)
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
      ...(lqip ? { lqip } : {}),
    }
    manifest.items.push(item)
    await writeJsonKey(manifestKey, manifest)
    return item
  },

  async getUploads(uploaderId) {
    const items = []
    for (const slug of await this.findSlugs(uploaderId)) {
      const manifest = await readJsonKey(`uploads/${slug}/manifest.json`, null)
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
      const manifestKey = `uploads/${slug}/manifest.json`
      const manifest = await readJsonKey(manifestKey, null)
      const item = manifest?.items.find((i) => i.id === id)
      if (item) {
        item.deleted = true
        item.deletedAt = new Date().toISOString()
        await writeJsonKey(manifestKey, manifest)
        return true
      }
    }
    return false
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

  // Stream a bucket object through our own origin with HTTP Range support.
  // iOS Safari needs same-origin, range-capable, correctly-typed audio — a 302
  // redirect to a presigned URL is unreliable for media playback there.
  async streamMedia(key, req, res, contentType) {
    try {
      const range = req.headers.range
      const out = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range || undefined }),
      )
      res.status(range && out.ContentRange ? 206 : 200)
      res.setHeader('Content-Type', contentType || out.ContentType || 'application/octet-stream')
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      if (out.ContentLength != null) res.setHeader('Content-Length', String(out.ContentLength))
      if (out.ContentRange) res.setHeader('Content-Range', out.ContentRange)
      out.Body.pipe(res)
    } catch {
      res.status(404).end()
    }
  },

  // Raw readable stream for one stored upload. Used by the admin "download
  // selected" zip so files never round-trip through the browser via S3.
  async readStream(slug, storedName) {
    const out = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `uploads/${slug}/${storedName}` }),
    )
    return out.Body
  },

  // True when a key exists — used to serve a cached thumbnail derivative.
  async hasFile(slug, name) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `uploads/${slug}/${name}` }))
      return true
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false
      throw err
    }
  },

  // Write a small derivative (e.g. a thumbnail) next to the original.
  async putBytes(slug, name, buffer, contentType) {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `uploads/${slug}/${name}`,
        Body: buffer,
        ContentType: contentType,
      }),
    )
  },

  // --- Generic single objects (invitation music, OG image) -----------------
  // Same keys as the local driver (e.g. "music/davetiye-music.mp3").

  async objectInfo(key) {
    try {
      const out = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
      return {
        exists: true,
        size: out.ContentLength,
        modifiedAt: out.LastModified ? out.LastModified.toISOString() : undefined,
      }
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return { exists: false }
      throw err
    }
  },

  async hasObject(key) {
    return (await this.objectInfo(key)).exists
  },

  async putObject(key, tempPath, contentType) {
    await new Upload({
      client,
      params: { Bucket: BUCKET, Key: key, Body: fs.createReadStream(tempPath), ContentType: contentType },
    }).done()
    fs.unlink(tempPath, () => {})
  },

  async deleteObject(key) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
      return true
    } catch {
      return false
    }
  },

  // Same range-capable streaming the music route relies on.
  async streamObject(key, req, res, contentType) {
    return this.streamMedia(key, req, res, contentType)
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
