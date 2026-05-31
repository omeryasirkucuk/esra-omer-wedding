// Full-screen viewer for one public-album item. Images fit the screen; videos
// play with native controls. Closes on the backdrop, the ✕, or Escape.
import { useEffect } from 'react'

export default function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null
  const isVideo = item.type?.startsWith('video')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {isVideo ? (
        <video
          src={item.url}
          controls
          autoPlay
          playsInline
          className="max-h-[82vh] max-w-full rounded"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={item.url}
          alt=""
          className="max-h-[82vh] max-w-full object-contain rounded"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {item.displayName && (
        <p className="mt-4 font-display italic text-white/90 text-base md:text-lg">{item.displayName}</p>
      )}
    </div>
  )
}
