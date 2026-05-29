import { useEffect, useRef } from 'react'
import Deck from './Deck.jsx'

// The track plays only on this page, starting as soon as it opens and fading in
// to a soft background level. We fetch ONE stable media URL first (a single
// presigned S3 URL) so mobile range-requests don't churn through redirects —
// that was cutting the music off after a second on phones. No on-screen control.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const TARGET_VOLUME = 0.35

export default function Invitation() {
  const rampRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    // Use a JS Audio object (not a DOM <audio>) so it can outlive this
    // component during the fade-out when the guest leaves the page.
    const audio = new Audio()
    audio.loop = true
    audio.volume = 0
    audio.preload = 'auto'
    let wantPlaying = true

    const clearRamp = () => {
      if (rampRef.current) clearInterval(rampRef.current)
      rampRef.current = null
    }
    const fadeTo = (target, ms) => {
      clearRamp()
      const steps = Math.max(1, Math.round(ms / 100))
      const start = audio.volume
      const delta = (target - start) / steps
      let i = 0
      rampRef.current = setInterval(() => {
        i += 1
        audio.volume = Math.min(1, Math.max(0, start + delta * i))
        if (i >= steps) clearRamp()
      }, 100)
    }
    const playAndFade = () => audio.play().then(() => fadeTo(TARGET_VOLUME, 6000)).catch(() => {})

    // If the browser blocks autoplay, start on the first touch instead.
    let removeGesture = () => {}
    const armGesture = () => {
      const onGesture = () => {
        playAndFade()
        removeGesture()
      }
      ;['pointerdown', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, onGesture))
      removeGesture = () =>
        ['pointerdown', 'touchstart', 'keydown'].forEach((e) => window.removeEventListener(e, onGesture))
    }

    // Fetch the single stable URL first, set it once, then start playback.
    fetch(`${API_BASE}/api/music-url`)
      .then((r) => r.json())
      .then(({ url }) => {
        if (cancelled || !url) return
        audio.src = url.startsWith('/') ? API_BASE + url : url
        audio.play().then(() => fadeTo(TARGET_VOLUME, 6000), () => armGesture())
      })
      .catch(() => {})

    // Pause when the screen locks / tab is hidden; resume when visible again.
    const onVisibility = () => {
      if (document.hidden) {
        clearRamp()
        audio.pause()
      } else if (wantPlaying && audio.paused) {
        audio.play().then(() => fadeTo(TARGET_VOLUME, 1500)).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Leaving the page: gentle fade-out, then stop.
    return () => {
      cancelled = true
      wantPlaying = false
      document.removeEventListener('visibilitychange', onVisibility)
      removeGesture()
      clearRamp()
      const steps = 14
      const start = audio.volume
      let i = 0
      const id = setInterval(() => {
        i += 1
        audio.volume = Math.max(0, start - (start / steps) * i)
        if (i >= steps) {
          clearInterval(id)
          audio.pause()
        }
      }, 80)
    }
  }, [])

  return <Deck />
}
