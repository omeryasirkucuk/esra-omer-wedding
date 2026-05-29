import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Emblem from '../components/Emblem.jsx'
import Sprig from '../components/Sprig.jsx'
import IdentityPrompt from '../components/IdentityPrompt.jsx'
import Composer from './pano/Composer.jsx'
import PostCard from './pano/PostCard.jsx'
import { api } from '../lib/api.js'
import { getUploaderId, hasProfile } from '../lib/identity.js'

const POLL_MS = 4000
const LIKED_KEY = 'eo_liked_posts'

function loadLikedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveLikedSet(set) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...set]))
}

// The live social memory board: compose at the top, polled feed below.
export default function Pano() {
  const [posts, setPosts] = useState([])
  const [pending, setPending] = useState([]) // newer posts held behind the pill
  const [liked, setLiked] = useState(loadLikedSet)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [gateOpen, setGateOpen] = useState(false)

  const feedRef = useRef(null)
  const me = getUploaderId()
  // A submission deferred until the guest has identified themselves once.
  const queuedSubmit = useRef(null)

  // Merge by id, keep newest first, de-duplicate.
  const mergePosts = useCallback((incoming, base) => {
    const map = new Map()
    for (const p of [...incoming, ...base]) map.set(p.id, p)
    return [...map.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
  }, [])

  const fetchPosts = useCallback(async () => {
    try {
      const { posts: fresh } = await api.listPosts()
      setPosts((current) => {
        if (current.length === 0) return fresh
        const knownNewest = Date.parse(current[0].createdAt)
        const brandNew = fresh.filter((p) => Date.parse(p.createdAt) > knownNewest)
        const atTop = (feedRef.current?.scrollTop || 0) <= 200
        if (brandNew.length && !atTop) {
          setPending((prev) => mergePosts(brandNew, prev))
          // Keep existing posts intact; merge metadata (likes) for known ones.
          return mergePosts(
            fresh.filter((p) => Date.parse(p.createdAt) <= knownNewest),
            current,
          )
        }
        setPending([])
        return mergePosts(fresh, current)
      })
    } catch {
      /* transient network error — next poll retries */
    }
  }, [mergePosts])

  useEffect(() => {
    fetchPosts()
    const t = setInterval(fetchPosts, POLL_MS)
    return () => clearInterval(t)
  }, [fetchPosts])

  const revealPending = () => {
    setPosts((current) => mergePosts(pending, current))
    setPending([])
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Returns true when the post was sent (so the composer can reset).
  const doSubmit = useCallback(async ({ text, file }) => {
    setBusy(true)
    setProgress(null)
    try {
      let media = null
      if (file) {
        setProgress(0)
        const item = await api.uploadFile(file, { onProgress: setProgress })
        media = { url: item.url, type: item.type }
      }
      const created = await api.createPost(media ? { text, media } : { text })
      setPosts((current) => mergePosts([created], current))
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }, [mergePosts])

  // Gate posting behind a one-time identity prompt.
  const handleSubmit = useCallback((payload) => {
    if (hasProfile()) return doSubmit(payload)
    return new Promise((resolve) => {
      queuedSubmit.current = { payload, resolve }
      setGateOpen(true)
    })
  }, [doSubmit])

  const onIdentityDone = () => {
    setGateOpen(false)
    const queued = queuedSubmit.current
    queuedSubmit.current = null
    if (queued) doSubmit(queued.payload).then(queued.resolve)
  }

  const toggleLike = async (id) => {
    const next = new Set(liked)
    const wasLiked = next.has(id)
    if (wasLiked) next.delete(id)
    else next.add(id)
    setLiked(next)
    saveLikedSet(next)
    // Optimistic count update.
    const delta = wasLiked ? -1 : 1
    setPosts((current) =>
      current.map((p) =>
        p.id === id ? { ...p, likes: Math.max(0, (p.likes || 0) + delta) } : p,
      ),
    )
    try {
      const { likes } = await api.likePost(id)
      setPosts((current) =>
        current.map((p) => (p.id === id ? { ...p, likes } : p)),
      )
    } catch {
      /* revert on failure */
      setLiked((prev) => {
        const reverted = new Set(prev)
        if (wasLiked) reverted.add(id)
        else reverted.delete(id)
        saveLikedSet(reverted)
        return reverted
      })
    }
  }

  const removePost = async (id) => {
    setPosts((current) => current.filter((p) => p.id !== id))
    try {
      await api.deletePost(id)
    } catch {
      fetchPosts()
    }
  }

  if (gateOpen) {
    return (
      <div className="paper min-h-[100svh]">
        <IdentityPrompt onDone={onIdentityDone} />
      </div>
    )
  }

  const now = Date.now()

  return (
    <div className="paper min-h-[100svh]">
      <div className="mx-auto flex min-h-[100svh] max-w-md md:max-w-lg flex-col px-5 pb-6 pt-7 md:pt-10">
        <div className="flex justify-center">
          <Emblem className="w-12 md:w-16" linkHome />
        </div>
        <p className="label mt-4 mb-4 text-center md:mt-5 md:text-[0.7rem]">Anı Panosu</p>

        <Composer onSubmit={handleSubmit} busy={busy} progress={progress} />

        <div className="relative mt-4 flex-1">
          {pending.length > 0 && (
            <button
              type="button"
              onClick={revealPending}
              className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 font-sans text-[11px] text-bg shadow-md"
              style={{ letterSpacing: '0.12em' }}
            >
              ↑ {pending.length} yeni gönderi
            </button>
          )}

          <div
            ref={feedRef}
            className="scroll-gold max-h-[calc(100svh-15rem)] space-y-3 overflow-y-auto pt-1"
          >
            {posts.length === 0 ? (
              <div className="flex flex-col items-center pt-12 text-center">
                <Sprig width={130} />
                <p className="mt-4 font-display italic text-primary-soft text-[15px] md:text-lg">
                  İlk anıyı sen bırak 🤍
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    now={now}
                    liked={liked.has(post.id)}
                    canDelete={post.uploaderId === me}
                    onLike={toggleLike}
                    onDelete={removePost}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
