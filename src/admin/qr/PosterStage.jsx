// Shows a poster at a comfortable on-screen size while keeping the actual poster
// node at its full base px size, so the export captures it crisply. The poster
// is auto-height (it grows with its content and never clips); we measure its real
// height and size the (CSS-scaled) preview box to match — no fixed height, so the
// preview can't crop the poster the way a fixed box would.
import { useLayoutEffect, useRef, useState } from 'react'

export default function PosterStage({ width, scale, children }) {
  const innerRef = useRef(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return undefined
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })

  return (
    <div
      style={{
        width: width * scale,
        height: height * scale,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(47,62,77,0.18)',
        borderRadius: 4,
        // The posters lean on SVG watercolor filters and multiply blends, which
        // re-rasterise on every frame while the page scrolls unless they live on
        // their own compositor layer. Isolate + GPU-promote each stage so its
        // filtered/blended output is rasterised once and merely translated on
        // scroll — the look is unchanged, the export still reads the same node.
        contain: 'paint',
        isolation: 'isolate',
        transform: 'translateZ(0)',
      }}
    >
      <div
        ref={innerRef}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width }}
      >
        {children}
      </div>
    </div>
  )
}
