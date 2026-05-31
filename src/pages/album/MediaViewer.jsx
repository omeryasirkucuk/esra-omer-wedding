// Full-screen, Instagram-style viewer for one item of a grid. Swipe (touch),
// arrows (desktop) and ←/→ keys move between items; Esc / backdrop / ✕ close.
//
// Pure UI: every surface (Fotoğraflarım, Düğün Albümü, admin Albüm) passes its
// own items and only the action callbacks that make sense there. The bottom bar
// always offers "Kaydet"; "Albüme Ekle/Çıkar" and "Sil" appear only when their
// callbacks are provided.
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { confirmDialog } from '../../lib/confirm.js'
import { saveMedia, basename } from '../../lib/mediaActions.js'

const SWIPE_THRESHOLD = 60

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export default function MediaViewer({ items, index, onIndexChange, onClose, srcFor, onDelete, onTogglePublic }) {
  const [busy, setBusy] = useState(false)
  const src = srcFor || ((i) => i.url)
  const item = items[index]

  const go = useCallback(
    (delta) => {
      const next = index + delta
      if (next >= 0 && next < items.length) onIndexChange(next)
    },
    [index, items.length, onIndexChange],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  if (!item) return null
  const isVideo = item.type?.startsWith('video')
  const canPrev = index > 0
  const canNext = index < items.length - 1

  const handleSave = async () => {
    if (busy) return
    setBusy(true)
    try {
      await saveMedia({ url: src(item), filename: item.originalName || basename(src(item)), mime: item.mime })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirmDialog('Bu medyayı silmek istiyor musun?'))) return
    onDelete(item)
    // Step back so the viewer stays on a valid item, or close if it was the last.
    if (items.length <= 1) onClose()
    else if (!canNext) onIndexChange(index - 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Stage */}
      <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
        {canPrev && (
          <button
            type="button"
            aria-label="Önceki"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            className="flex absolute left-3 z-10 w-11 h-11 rounded-full bg-white/20 text-white items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={item.id}
            className="max-h-full flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.x <= -SWIPE_THRESHOLD) go(1)
              else if (info.offset.x >= SWIPE_THRESHOLD) go(-1)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <video src={src(item)} controls autoPlay playsInline className="max-h-[74vh] max-w-full rounded" />
            ) : (
              <img src={src(item)} alt="" draggable={false} className="max-h-[74vh] max-w-full object-contain rounded select-none" />
            )}
          </motion.div>
        </AnimatePresence>

        {canNext && (
          <button
            type="button"
            aria-label="Sonraki"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            className="flex absolute right-3 z-10 w-11 h-11 rounded-full bg-white/20 text-white items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="shrink-0 px-5 pb-7 pt-3 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {item.displayName && (
          <p className="text-center leading-tight">
            <span className="block font-sans uppercase text-[0.55rem] tracking-[0.2em] text-white/55">Paylaşan</span>
            <span className="font-display italic text-white text-lg md:text-xl">{item.displayName}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-primary font-sans uppercase text-[0.62rem] tracking-[0.18em] px-4 py-2 disabled:opacity-50"
          >
            <SaveIcon /> {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {onTogglePublic && (
            <button
              type="button"
              onClick={() => onTogglePublic(item)}
              className="rounded-full border border-gold text-gold font-sans uppercase text-[0.62rem] tracking-[0.18em] px-4 py-2"
            >
              {item.public ? 'Albümden Çıkar' : 'Albüme Ekle'}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-rose/60 text-rose font-sans uppercase text-[0.62rem] tracking-[0.18em] px-4 py-2"
            >
              Sil
            </button>
          )}
        </div>
        {items.length > 1 && (
          <p className="font-sans text-white/60 text-[0.6rem] tracking-[0.18em]">
            {index + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  )
}
