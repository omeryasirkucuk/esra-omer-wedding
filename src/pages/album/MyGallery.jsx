// "Yüklediklerin" — the guest's own uploads as a scrollable square grid.
// Scoped to this device by the API, so it only ever holds the guest's media.
// Built for hundreds of items: lazy/async images and a capped, scrollable grid.

function GalleryItem({ item, onDelete }) {
  const isVideo = item.type?.startsWith('video')

  return (
    <div className="relative aspect-square rounded overflow-hidden bg-[#efe6d4] group">
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
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label="Sil"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose/90 text-white flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </div>
  )
}

export default function MyGallery({ items, onDelete }) {
  return (
    <section className="w-full mt-10">
      <div className="flex items-center justify-center gap-2 mb-4">
        <p className="label md:text-[0.7rem]">Yüklediklerin</p>
        <span className="label-gold md:text-[0.7rem]">· {items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="font-display italic text-muted text-[13px] md:text-sm">Henüz bir şey yok</p>
      ) : (
        <div className="scroll-gold overflow-y-auto max-h-[60vh] pr-1">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {items.map((item) => (
              <GalleryItem key={item.id} item={item} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
