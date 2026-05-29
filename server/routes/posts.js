import { Router } from 'express'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'

// The live memory board. Posts are public to all guests; the feed is polled.
export const postsRouter = Router()

function publicView(p) {
  return {
    id: p.id,
    displayName: p.displayName,
    text: p.text,
    media: p.media,
    likes: p.likes,
    createdAt: p.createdAt,
    uploaderId: p.uploaderId, // lets a client mark its own posts as deletable
  }
}

// GET /api/posts?since=<iso>  → newest first; with `since`, only newer ones.
postsRouter.get('/', async (req, res, next) => {
  try {
    const since = req.query.since ? Date.parse(req.query.since) : 0
    const posts = (await storage.getCollection('posts'))
      .filter((p) => !p.deleted && Date.parse(p.createdAt) > since)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(publicView)
    res.json({ posts, serverTime: new Date().toISOString() })
  } catch (err) {
    next(err)
  }
})

// POST /api/posts  { uploaderId, displayName, text, media? }
postsRouter.post('/', async (req, res, next) => {
  try {
    const { uploaderId, displayName, text, media } = req.body || {}
    if (!text && !media) return res.status(400).json({ error: 'empty post' })
    const posts = await storage.getCollection('posts')
    const post = {
      id: nanoid(12),
      uploaderId: uploaderId || 'anon',
      displayName: displayName || 'Misafir',
      text: (text || '').slice(0, 500),
      media: media || null, // { url, type: 'image' | 'video' }
      likes: 0,
      likedBy: [],
      deleted: false,
      createdAt: new Date().toISOString(),
    }
    posts.push(post)
    await storage.saveCollection('posts', posts)
    res.status(201).json(publicView(post))
  } catch (err) {
    next(err)
  }
})

// One like per device (uploaderId), toggleable.
postsRouter.post('/:id/like', async (req, res, next) => {
  try {
    const { uploaderId } = req.body || {}
    const posts = await storage.getCollection('posts')
    const post = posts.find((p) => p.id === req.params.id)
    if (!post) return res.status(404).json({ error: 'not found' })
    post.likedBy = post.likedBy || []
    const i = post.likedBy.indexOf(uploaderId)
    if (i === -1) post.likedBy.push(uploaderId)
    else post.likedBy.splice(i, 1)
    post.likes = post.likedBy.length
    await storage.saveCollection('posts', posts)
    res.json({ likes: post.likes })
  } catch (err) {
    next(err)
  }
})

// Soft-delete: only the author's own device may remove its post.
postsRouter.post('/:id/delete', async (req, res, next) => {
  try {
    const { uploaderId } = req.body || {}
    const posts = await storage.getCollection('posts')
    const post = posts.find((p) => p.id === req.params.id)
    if (!post) return res.status(404).json({ error: 'not found' })
    if (post.uploaderId !== uploaderId) return res.status(403).json({ error: 'forbidden' })
    post.deleted = true
    post.deletedAt = new Date().toISOString()
    await storage.saveCollection('posts', posts)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
