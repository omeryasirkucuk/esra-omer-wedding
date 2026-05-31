// One grid tile's visual: a small cached thumbnail for images, and for videos the
// real poster frame (same /thumb endpoint) with a refined play badge. If a video
// has no poster yet, it falls back to an on-brand gradient — never the raw video.
// Sits inside a relative, aspect-square parent supplied by each gallery.
import { useState } from 'react'
import { thumbUrl, isVideoItem } from '../../lib/mediaActions.js'

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

  return (
    <>
      {isVideo && posterFailed ? (
        <span className="absolute inset-0 bg-gradient-to-br from-[#cdbfa0] to-[#aab6bd]" />
      ) : (
        <img
          src={thumbUrl(item)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={isVideo ? () => setPosterFailed(true) : undefined}
          className="w-full h-full object-cover"
        />
      )}
      {isVideo && <PlayBadge />}
    </>
  )
}
