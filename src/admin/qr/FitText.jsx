// Text that auto-scales to fill its container without overflowing. The group
// label on the guest card can be short ("P&G") or long ("Damat Arkadaşları"),
// so we binary-search the largest font size that fits the available width and
// height. The fitted size is applied before export, so the PNG matches.
import { useLayoutEffect, useRef, useState } from 'react'

export default function FitText({ text, maxSize, minSize = 22, className, style }) {
  const boxRef = useRef(null)
  const textRef = useRef(null)
  const [size, setSize] = useState(maxSize)

  useLayoutEffect(() => {
    const box = boxRef.current
    const el = textRef.current
    if (!box || !el) return
    const availW = box.clientWidth
    const availH = box.clientHeight
    if (!availW || !availH) return

    let lo = minSize
    let hi = maxSize
    let best = minSize
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2
      el.style.fontSize = `${mid}px`
      const fits = el.scrollWidth <= availW + 0.5 && el.scrollHeight <= availH + 0.5
      if (fits) {
        best = mid
        lo = mid
      } else {
        hi = mid
      }
    }
    el.style.fontSize = `${best}px`
    if (Math.abs(best - size) > 0.3) setSize(best)
  })

  return (
    <div
      ref={boxRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <div ref={textRef} className={className} style={{ ...style, fontSize: size }}>
        {text}
      </div>
    </div>
  )
}
