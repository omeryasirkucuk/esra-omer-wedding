import { useEffect, useRef } from 'react'
import Deck from './Deck.jsx'

// Background music for the invitation only. iOS will not play audio *audibly*
// until a real user gesture, and trying to autoplay on mount produced a silent
// 1-second blip on iPhone. So we prepare the audio up front and start it on the
// guest's first interaction (tap/scroll-tap) — which happens within a moment of
// landing. Fades in to a soft level; no on-screen control by design.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const TARGET_VOLUME = 0.35

export default function Invitation() {
  const rampRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let started = false
    let wantPlaying = true
    const audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0

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
    const play = () => {
      if (!audio.src) return
      audio.play().then(() => fadeTo(TARGET_VOLUME, 4000)).catch(() => {})
    }

    // Fetch the single stable media URL once (no per-range redirect churn).
    fetch(`${API_BASE}/api/music-url`)
      .then((r) => r.json())
      .then(({ url }) => {
        if (cancelled || !url) return
        audio.src = url.startsWith('/') ? API_BASE + url : url
        if (started) play() // gesture already happened while we were fetching
      })
      .catch(() => {})

    // Start audibly on the first user gesture (the reliable iOS path).
    const events = ['touchend', 'pointerup', 'click', 'keydown']
    const onGesture = () => {
      if (started) return
      started = true
      play()
      events.forEach((e) => window.removeEventListener(e, onGesture))
    }
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))

    // Pause when the screen locks / tab is hidden; resume when visible again.
    const onVisibility = () => {
      if (document.hidden) {
        clearRamp()
        audio.pause()
      } else if (started && wantPlaying && audio.paused) {
        audio.play().then(() => fadeTo(TARGET_VOLUME, 1500)).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Leaving the page: gentle fade-out, then stop.
    return () => {
      cancelled = true
      wantPlaying = false
      events.forEach((e) => window.removeEventListener(e, onGesture))
      document.removeEventListener('visibilitychange', onVisibility)
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
