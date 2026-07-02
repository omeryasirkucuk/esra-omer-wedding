// One grid tile's visual: a small cached thumbnail for images, and for videos the
// real poster frame (same /thumb endpoint) with a refined play badge. If a video
// has no poster yet, it falls back to an on-brand gradient — never the raw video.
// Sits inside a relative, aspect-square parent supplied by each gallery.
//
// On weak connections the tile shows an inline blur placeholder (item.lqip, a
// tiny base64 WebP — zero extra requests) immediately, then fades the real
// thumbnail in on load. Images use srcset so a dense phone grid pulls the 250 px
// asset while wider grids pull 500 px.
import { useState } from 'react'
import { thumbUrl, isVideoItem } from '../../lib/mediaActions.js'

// Grid is 3 cols on phones, 5 on md, 6 on lg — so a tile is roughly a third of
// the viewport on mobile and a sixth on desktop. Lets the browser pick 250/500.
const TILE_SIZES = '(min-width: 1024px) 16vw, (min-width: 768px) 20vw, 33vw'

function PlayBadge() {
  return (
    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center shadow">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="ml-0.5">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  )
}

export default function MediaThumb({ item }) {
  const isVideo = isVideoItem(item)
  const [posterFailed, setPosterFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const showFallback = isVideo && posterFailed

  return (
    <>
      {/* Instant blurred preview underneath the real image (images only). */}
      {item.lqip && !showFallback && (
        <img
          src={item.lqip}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-md"
        />
      )}
      {showFallback ? (
        <span className="absolute inset-0 bg-gradient-to-br from-[#cdbfa0] to-[#aab6bd]" />
      ) : (
        <img
          // An already-cached image can finish before React attaches onLoad, so
          // also mark it loaded via the ref when the browser reports complete.
          ref={(el) => el?.complete && setLoaded(true)}
          src={thumbUrl(item, 500)}
          srcSet={isVideo ? undefined : `${thumbUrl(item, 250)} 250w, ${thumbUrl(item, 500)} 500w`}
          sizes={isVideo ? undefined : TILE_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={isVideo ? () => setPosterFailed(true) : undefined}
          className={`relative w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {isVideo && <PlayBadge />}
    </>
  )
}
