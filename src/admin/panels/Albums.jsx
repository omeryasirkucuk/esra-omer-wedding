// Albums panel: grouped by uploader. Each section shows the uploader name and
// their non-deleted media count, then a responsive thumbnail grid. Each thumb
// can be deleted (soft-delete on the server, removed locally on success).
//
// A "Seç" selection mode lets the admin pick thumbnails across uploaders and
// bulk-delete them at once. Selection is tracked by a "{slug}::{id}" key.
import { useEffect, useState } from 'react'
import { getUploaders, deleteUpload, setUploadPublic, mediaUrl, fileDownloadUrl, selectedZipUrl } from '../adminApi'
import { confirmDialog, alertDialog } from '../../lib/confirm.js'
import MediaViewer from '../../pages/album/MediaViewer.jsx'
import MediaThumb from '../../pages/album/MediaThumb.jsx'

const selKey = (slug, id) => `${slug}::${id}`

export default function Albums({ onAuthError }) {
  const [uploaders, setUploaders] = useState(null)
  const [error, setError] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [downloading, setDownloading] = useState(false)
  const [viewer, setViewer] = useState(null) // { slug, index } of the open item

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

  function exitSelection() {
    setSelecting(false)
    setSelected(new Set())
  }

  function toggleSelected(slug, id) {
    setSelected((prev) => {
      const next = new Set(prev)
      const key = selKey(slug, id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Drop one item from local state (used after a successful server delete).
  function dropFromState(slug, id) {
    setUploaders((prev) =>
      prev.map((u) =>
        u.slug === slug ? { ...u, items: u.items.filter((it) => it.id !== id) } : u,
      ),
    )
  }

  // Remove an item from local state after a successful server delete.
  async function handleDelete(slug, id) {
    try {
      await deleteUpload(slug, id)
      dropFromState(slug, id)
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('Silinemedi, tekrar deneyin.')
    }
  }

  // Resolve a selection key back to its full item (for name/type/storedName).
  function findItem(slug, id) {
    const u = uploaders.find((x) => x.slug === slug)
    return u && u.items.find((it) => it.id === id)
  }

  // Save the selected media. On phones/tablets we hand the files to the native
  // share sheet (Save to Photos); on desktop we download a single ZIP.
  async function handleBulkDownload() {
    if (selected.size === 0 || downloading) return
    const picks = [...selected]
      .map((key) => {
        const [slug, id] = key.split('::')
        return { slug, id, item: findItem(slug, id) }
      })
      .filter((p) => p.item)
    if (picks.length === 0) return

    // Touch devices (phone/tablet) get the share sheet. A Mac reports
    // canShare({files}) too, but its sheet has no "save to disk" — so anything
    // that isn't a coarse pointer / multi-touch screen takes the ZIP path.
    const isTouch =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1)

    setDownloading(true)
    try {
      // Mobile: native share → Save to Photos.
      if (isTouch && navigator.canShare) {
        try {
          const files = await Promise.all(
            picks.map(async ({ slug, item }) => {
              const res = await fetch(fileDownloadUrl(slug, item))
              if (!res.ok) throw new Error('fetch failed')
              const blob = await res.blob()
              return new File([blob], item.originalName || item.storedName, {
                type: blob.type || item.mime || 'application/octet-stream',
              })
            }),
          )
          if (navigator.canShare({ files })) {
            await navigator.share({ files })
            return
          }
        } catch (e) {
          if (e && e.name === 'AbortError') return // user dismissed the sheet
          // anything else → fall through to the ZIP download
        }
      }

      // Desktop: one ZIP, one download.
      const a = document.createElement('a')
      a.href = selectedZipUrl(picks.map(({ slug, id }) => ({ slug, id })))
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setDownloading(false)
    }
  }

  // Flip an item's public flag in local state after a successful server write.
  function setPublicInState(slug, id, isPublic) {
    setUploaders((prev) =>
      prev.map((u) =>
        u.slug === slug
          ? { ...u, items: u.items.map((it) => (it.id === id ? { ...it, public: isPublic } : it)) }
          : u,
      ),
    )
  }

  // Smart promote/demote: if every selected item is already public, the action
  // removes them from the public album; otherwise it shares them.
  const selectedItems = [...selected]
    .map((key) => {
      const [slug, id] = key.split('::')
      return { slug, id, item: uploaders ? findItem(slug, id) : null }
    })
    .filter((p) => p.item)
  const allSelectedPublic = selectedItems.length > 0 && selectedItems.every((p) => p.item.public)

  // Single-item promote/demote, used by the full-screen viewer.
  async function handleToggleOnePublic(slug, item) {
    const next = !item.public
    try {
      await setUploadPublic(slug, item.id, next)
      setPublicInState(slug, item.id, next)
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('İşlem başarısız, tekrar deneyin.')
    }
  }

  async function handleBulkSetPublic() {
    if (selectedItems.length === 0) return
    const makePublic = !allSelectedPublic
    let authFailed = false
    for (const { slug, id } of selectedItems) {
      try {
        await setUploadPublic(slug, id, makePublic)
        setPublicInState(slug, id, makePublic)
      } catch (e) {
        if (e.name === 'AuthError') {
          authFailed = true
          break
        }
      }
    }
    exitSelection()
    if (authFailed) onAuthError()
  }

  async function handleBulkDelete() {
    const keys = [...selected]
    if (keys.length === 0) return
    if (!(await confirmDialog(`${keys.length} medyayı silmek istiyor musun?`))) return

    let authFailed = false
    for (const key of keys) {
      const [slug, id] = key.split('::')
      try {
        await deleteUpload(slug, id)
        dropFromState(slug, id)
      } catch (e) {
        if (e.name === 'AuthError') {
          authFailed = true
          break
        }
        // Skip a single failure and keep going with the rest.
      }
    }
    exitSelection()
    if (authFailed) onAuthError()
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!uploaders) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  const liveItems = (u) => u.items.filter((it) => !it.deleted)
  const grandTotal = uploaders.reduce((n, u) => n + liveItems(u).length, 0)

  if (grandTotal === 0)
    return <p className="text-muted text-center py-10">Henüz yüklenen medya yok</p>

  return (
    <div className="scroll-gold overflow-auto max-h-[74vh] pr-1">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="label">{grandTotal} medya</p>
        {selecting ? (
          <button type="button" onClick={exitSelection} className="label-gold">
            Vazgeç
          </button>
        ) : (
          <button type="button" onClick={() => setSelecting(true)} className="label-gold">
            Seç
          </button>
        )}
      </div>

      {selecting && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 mb-4 rounded-full border border-line bg-surface/90 backdrop-blur px-4 py-2">
          <span className="label shrink-0">{selected.size} seçili</span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleBulkSetPublic}
              disabled={selected.size === 0}
              className="btn-lux disabled:opacity-40"
            >
              {allSelectedPublic ? 'Albümden Çıkar' : 'Albüme Ekle'}
            </button>
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={selected.size === 0 || downloading}
              className="btn-lux disabled:opacity-40"
            >
              {downloading ? 'İndiriliyor…' : 'Seçilenleri İndir'}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selected.size === 0}
              className="btn-lux disabled:opacity-40"
            >
              Seçilenleri Sil
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {uploaders.map((u) => {
          const items = liveItems(u)
          if (items.length === 0) return null
          return (
            <section key={u.slug}>
              <h3 className="font-display text-xl text-primary mb-1">{u.displayName}</h3>
              <p className="label-gold mb-3">{items.length} medya</p>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {items.map((it, i) => (
                  <Thumb
                    key={it.id}
                    item={it}
                    selecting={selecting}
                    selected={selected.has(selKey(u.slug, it.id))}
                    onToggle={() => toggleSelected(u.slug, it.id)}
                    onDelete={() => handleDelete(u.slug, it.id)}
                    onOpen={() => setViewer({ slug: u.slug, index: i })}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {viewer &&
        (() => {
          const u = uploaders.find((x) => x.slug === viewer.slug)
          const vItems = u ? liveItems(u) : []
          if (!vItems[viewer.index]) return null
          return (
            <MediaViewer
              items={vItems}
              index={viewer.index}
              onIndexChange={(i) => setViewer({ slug: viewer.slug, index: i })}
              onClose={() => setViewer(null)}
              srcFor={(it) => mediaUrl(it.url)}
              onDelete={(it) => handleDelete(viewer.slug, it.id)}
              onTogglePublic={(it) => handleToggleOnePublic(viewer.slug, it)}
            />
          )
        })()}
    </div>
  )
}

function Thumb({ item, onDelete, selecting, selected, onToggle, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => (selecting ? onToggle() : onOpen())}
      className={`relative group card-soft overflow-hidden aspect-square block w-full cursor-pointer ${
        selected ? 'ring-2 ring-gold' : ''
      }`}
    >
      <MediaThumb item={item} />

      {item.public && (
        <span
          aria-label="Düğün albümünde"
          className="absolute top-1 left-1 rounded-full bg-gold/90 text-white px-1.5 py-0.5 flex items-center pointer-events-none"
        >
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
          </svg>
        </span>
      )}

      {selecting ? (
        <>
          {selected && <span className="absolute inset-0 bg-primary/30 pointer-events-none" />}
          <span
            className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-white pointer-events-none ${
              selected ? 'bg-gold' : 'bg-black/30 border border-white/70'
            }`}
          >
            {selected && (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </>
      ) : (
        <span
          role="button"
          tabIndex={0}
          aria-label="Sil"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-surface/90 border border-line flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        >
          🗑
        </span>
      )}
    </button>
  )
}
