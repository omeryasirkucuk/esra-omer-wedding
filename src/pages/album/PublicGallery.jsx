// "Düğün Albümü" — the shared, public gallery every guest can see. Read-only:
// photos arrive here only when a guest (or the admin) makes them public. It
// polls live like the Anı Panosu, replacing the list each tick so demotes and
// deletions self-heal. Each tile shows who shared it; tapping opens a lightbox.
//
// Selection ("Seç") offers a single bulk action: Kaydet, which downloads the
// picked items (share sheet on phones, one ZIP on desktop).
import { useCallback, useState } from 'react'
import Sprig from '../../components/Sprig.jsx'
import { api } from '../../lib/api.js'
import { usePoll } from '../../lib/usePoll.js'
import { bulkSaveMedia } from '../../lib/bulkSave.js'
import { displayUrl } from '../../lib/mediaActions.js'
import MediaThumb from './MediaThumb.jsx'
import MediaViewer from './MediaViewer.jsx'
import SelectCheck from './SelectCheck.jsx'

const POLL_MS = 5000

function Tile({ item, onOpen, selecting, selected, onToggle }) {
  return (
    <figure className="m-0">
      <button
        type="button"
        onClick={() => (selecting ? onToggle(item.id) : onOpen(item))}
        className={`relative block aspect-square w-full rounded overflow-hidden bg-[#efe6d4] ${
          selected ? 'ring-2 ring-gold' : ''
        }`}
      >
        <MediaThumb item={item} />
        {selecting && <SelectCheck selected={selected} />}
      </button>
      {item.displayName && (
        <figcaption className="mt-1 text-center font-display italic text-muted text-[11px] md:text-xs truncate">
          {item.displayName}
        </figcaption>
      )}
    </figure>
  )
}

export default function PublicGallery() {
  const [items, setItems] = useState([])
  const [viewer, setViewer] = useState(null) // index of the open item, or null
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    const res = await api.listPublicUploads()
    const next = res?.items || []
    setItems(next)
    // An item can be demoted/deleted mid-selection — drop stale picks.
    setSelected((prev) => {
      const live = new Set(next.map((i) => i.id))
      const pruned = new Set([...prev].filter((id) => live.has(id)))
      return pruned.size === prev.size ? prev : pruned
    })
  }, [])

  usePoll(fetchItems, POLL_MS)

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

  const bulkSave = async () => {
    const picks = items.filter((i) => selected.has(i.id))
    if (picks.length === 0 || saving) return
    setSaving(true)
    try {
      await bulkSaveMedia(picks)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-4">
        <p className="label md:text-[0.7rem]">Paylaşılan Anılar</p>
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
        <div className="flex items-center justify-between gap-2 mb-4 rounded-full border border-line bg-surface/70 backdrop-blur px-4 py-2">
          <span className="label md:text-[0.7rem] shrink-0">{selected.size} seçili</span>
          <button
            type="button"
            onClick={bulkSave}
            disabled={selected.size === 0 || saving}
            className="btn-lux disabled:opacity-40"
            style={{ background: 'var(--c-primary)', color: '#fffdf8', borderColor: 'var(--c-primary)' }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center pt-6 text-center">
          <Sprig width={130} />
          <p className="mt-4 font-display italic text-muted text-[13px] md:text-sm">
            Henüz paylaşılan fotoğraf yok
          </p>
        </div>
      ) : (
        <div className="scroll-gold overflow-y-auto max-h-[68vh] pr-1">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {items.map((item, i) => (
              <Tile
                key={item.id}
                item={item}
                onOpen={() => setViewer(i)}
                selecting={selecting}
                selected={selected.has(item.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {viewer != null && items[viewer] && (
        <MediaViewer
          items={items}
          index={viewer}
          onIndexChange={setViewer}
          onClose={() => setViewer(null)}
          srcFor={(i) => displayUrl(i.url)}
        />
      )}
    </div>
  )
}
