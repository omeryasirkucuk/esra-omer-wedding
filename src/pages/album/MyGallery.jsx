// "Yüklediklerin" — the guest's own uploads as a scrollable square grid.
// Scoped to this device by the API, so it only ever holds the guest's media.
// Built for hundreds of items: lazy/async images and a capped, scrollable grid.
//
// Two modes:
//  - Normal: tapping a thumb does nothing special; a per-item 🗑 deletes it.
//  - Selection ("Seç"): tapping a thumb toggles a check; a bar bulk-deletes the
//    selected items at once.

import { useState } from 'react'
import { confirmDialog } from '../../lib/confirm.js'

function GalleryItem({ item, onDelete, selecting, selected, onToggle }) {
  const isVideo = item.type?.startsWith('video')

  return (
    <button
      type="button"
      onClick={() => selecting && onToggle(item.id)}
      className={`relative block aspect-square rounded overflow-hidden bg-[#efe6d4] group w-full ${
        selecting ? 'cursor-pointer' : 'cursor-default'
      } ${selected ? 'ring-2 ring-gold' : ''}`}
    >
      <img
        src={item.url}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center text-white text-xl pointer-events-none drop-shadow">
          ▶
        </span>
      )}

      {selecting ? (
        <>
          {selected && <span className="absolute inset-0 bg-primary/30 pointer-events-none" />}
          <span
            className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white pointer-events-none ${
              selected ? 'bg-gold' : 'bg-black/30 border border-white/70'
            }`}
          >
            {selected && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
            onDelete(item)
          }}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose/90 text-white flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
          </svg>
        </span>
      )}
    </button>
  )
}

export default function MyGallery({ items, onDelete, onBulkDelete }) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const exitSelection = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkDelete = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    if (!(await confirmDialog(`${ids.length} yüklemeyi silmek istiyor musun?`))) return
    await onBulkDelete(ids)
    exitSelection()
  }

  return (
    <section className="w-full mt-10">
      <div className="flex items-center justify-center gap-2 mb-4">
        <p className="label md:text-[0.7rem]">Yüklediklerin</p>
        <span className="label-gold md:text-[0.7rem]">· {items.length}</span>
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-center mb-4">
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
      )}

      {selecting && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-full border border-line bg-surface/70 backdrop-blur px-4 py-2">
          <span className="label md:text-[0.7rem]">{selected.size} seçili</span>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={selected.size === 0}
            className="btn-lux disabled:opacity-40"
          >
            Seçilenleri Sil
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="font-display italic text-muted text-[13px] md:text-sm">Henüz bir şey yok</p>
      ) : (
        <div className="scroll-gold overflow-y-auto max-h-[60vh] pr-1">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {items.map((item) => (
              <GalleryItem
                key={item.id}
                item={item}
                onDelete={onDelete}
                selecting={selecting}
                selected={selected.has(item.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
