// Posts panel: the guest pinboard ("pano") feed, newest first. Each post shows
// author, time, text, optional media thumbnail and like count, with a delete
// action. Deleted posts are hidden by default and revealable via a toggle.
import { useEffect, useMemo, useState } from 'react'
import { getPosts, deletePost, mediaUrl } from '../adminApi'
import { formatDateTime } from '../format'

export default function Posts({ onAuthError }) {
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    let alive = true
    getPosts()
      .then((d) => alive && setPosts(d.posts || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Newest first, optionally filtering out soft-deleted posts.
  const visible = useMemo(() => {
    if (!posts) return []
    const list = showDeleted ? posts : posts.filter((p) => !p.deleted)
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [posts, showDeleted])

  async function handleDelete(id) {
    try {
      await deletePost(id)
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, deleted: true } : p)))
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else alert('Silinemedi, tekrar deneyin.')
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!posts) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  const liveCount = posts.filter((p) => !p.deleted).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="label">{liveCount} gönderi</p>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="accent-gold"
          />
          silinenleri göster
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted text-center py-10">Henüz gönderi yok</p>
      ) : (
        <div className="scroll-gold overflow-auto max-h-[72vh] space-y-3 pr-1">
          {visible.map((p) => (
            <PostCard key={p.id} post={p} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, onDelete }) {
  return (
    <article
      className={`card-soft p-4 flex gap-3 ${post.deleted ? 'opacity-50' : ''}`}
    >
      {post.media && <Media media={post.media} />}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-lg text-primary">{post.displayName}</span>
          <span className="text-muted text-xs">{formatDateTime(post.createdAt)}</span>
          {post.deleted && (
            <span className="label-gold text-[0.55rem] border border-line rounded px-1.5 py-0.5">
              silindi
            </span>
          )}
        </div>

        {post.text && <p className="text-ink mt-1 whitespace-pre-wrap break-words">{post.text}</p>}

        <div className="mt-2 text-muted text-sm">♥ {post.likes ?? 0}</div>
      </div>

      {!post.deleted && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Sil"
          className="self-start w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
        >
          🗑
        </button>
      )}
    </article>
  )
}

function Media({ media }) {
  const src = mediaUrl(media.url)
  const isVideo = media.type === 'video'
  return (
    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden card-soft">
      {isVideo ? (
        <>
          <video src={src} className="w-full h-full object-cover" preload="metadata" muted />
          <span className="absolute inset-0 flex items-center justify-center text-white/90 text-xl pointer-events-none drop-shadow">
            ▶
          </span>
        </>
      ) : (
        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
      )}
    </div>
  )
}
