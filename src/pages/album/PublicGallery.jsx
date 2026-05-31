// "Düğün Albümü" — the shared, public gallery every guest can see. Read-only:
// photos arrive here only when a guest (or the admin) makes them public. It
// polls live like the Anı Panosu, replacing the list each tick so demotes and
// deletions self-heal. Each tile shows who shared it; tapping opens a lightbox.
import { useEffect, useState } from 'react'
import Sprig from '../../components/Sprig.jsx'
import { api } from '../../lib/api.js'
import { thumbUrl } from '../../lib/mediaActions.js'
import MediaViewer from './MediaViewer.jsx'

const POLL_MS = 5000

function Tile({ item, onOpen }) {
  const isVideo = item.type?.startsWith('video')
  return (
    <figure className="m-0">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative block aspect-square w-full rounded overflow-hidden bg-[#efe6d4]"
      >
        {isVideo ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[#d9cdb4] text-white text-2xl pointer-events-none drop-shadow">
            ▶
          </span>
        ) : (
          <img src={thumbUrl(item)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        )}
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

  useEffect(() => {
    let alive = true
    const fetchItems = async () => {
      try {
        const res = await api.listPublicUploads()
        if (alive) setItems(res?.items || [])
      } catch {
        // transient network error — the next poll retries
      }
    }
    fetchItems()
    const t = setInterval(fetchItems, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-6">
        <p className="label md:text-[0.7rem]">Paylaşılan Anılar</p>
        <span className="label-gold md:text-[0.7rem]">· {items.length}</span>
      </div>

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
              <Tile key={item.id} item={item} onOpen={() => setViewer(i)} />
            ))}
          </div>
        </div>
      )}

      {viewer != null && items[viewer] && (
        <MediaViewer items={items} index={viewer} onIndexChange={setViewer} onClose={() => setViewer(null)} />
      )}
    </div>
  )
}
