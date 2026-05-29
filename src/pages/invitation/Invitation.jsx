import { useEffect, useRef } from 'react'
import Deck from './Deck.jsx'

// Track is served from the bucket via /api/music (presigned). It plays only on
// this page, starting as soon as the page opens, fading in to a soft background
// level. No on-screen control by design.
const MUSIC_SRC = (import.meta.env.VITE_API_BASE || '') + '/api/music'
const TARGET_VOLUME = 0.35

export default function Invitation() {
  const rampRef = useRef(null)

  useEffect(() => {
    // Use a JS Audio object (not a DOM <audio>) so it can outlive this
    // component during the fade-out when the guest leaves the page.
    const audio = new Audio(MUSIC_SRC)
    audio.loop = true
    audio.volume = 0
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

    // Start immediately. If the browser blocks autoplay, start on first touch.
    let removeGesture = () => {}
    audio.play().then(
      () => fadeTo(TARGET_VOLUME, 6000),
      () => {
        const onGesture = () => {
          playAndFade()
          removeGesture()
        }
        ;['pointerdown', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, onGesture))
        removeGesture = () =>
          ['pointerdown', 'touchstart', 'keydown'].forEach((e) => window.removeEventListener(e, onGesture))
      },
    )

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
