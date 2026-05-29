// Albums panel: grouped by uploader. Each section shows the uploader name and
// their non-deleted media count, then a responsive thumbnail grid. Each thumb
// can be deleted (soft-delete on the server, removed locally on success).
import { useEffect, useState } from 'react'
import { getUploaders, deleteUpload, mediaUrl } from '../adminApi'

export default function Albums({ onAuthError }) {
  const [uploaders, setUploaders] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    getUploaders()
      .then((d) => alive && setUploaders(d.uploaders || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Remove an item from local state after a successful server delete.
  async function handleDelete(slug, id) {
    try {
      await deleteUpload(slug, id)
      setUploaders((prev) =>
        prev.map((u) =>
          u.slug === slug ? { ...u, items: u.items.filter((it) => it.id !== id) } : u,
        ),
      )
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else alert('Silinemedi, tekrar deneyin.')
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!uploaders) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  const liveItems = (u) => u.items.filter((it) => !it.deleted)
  const grandTotal = uploaders.reduce((n, u) => n + liveItems(u).length, 0)

  if (grandTotal === 0)
    return <p className="text-muted text-center py-10">Henüz yüklenen medya yok</p>

  return (
    <div className="scroll-gold overflow-auto max-h-[74vh] pr-1">
      <p className="label mb-4">{grandTotal} medya</p>

      <div className="space-y-8">
        {uploaders.map((u) => {
          const items = liveItems(u)
          if (items.length === 0) return null
          return (
            <section key={u.slug}>
              <h3 className="font-display text-xl text-primary mb-1">{u.displayName}</h3>
              <p className="label-gold mb-3">{items.length} medya</p>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {items.map((it) => (
                  <Thumb
                    key={it.id}
                    item={it}
                    onDelete={() => handleDelete(u.slug, it.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Thumb({ item, onDelete }) {
  const isVideo = item.type === 'video'
  const src = mediaUrl(item.url)
  return (
    <div className="relative group card-soft overflow-hidden aspect-square">
      {isVideo ? (
        <>
          <video src={src} className="w-full h-full object-cover" preload="metadata" muted />
          <span className="absolute inset-0 flex items-center justify-center text-white/90 text-2xl pointer-events-none drop-shadow">
            ▶
          </span>
        </>
      ) : (
        <img
          src={src}
          alt={item.originalName || ''}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Sil"
        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-surface/90 border border-line flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
      >
        🗑
      </button>
    </div>
  )
}
