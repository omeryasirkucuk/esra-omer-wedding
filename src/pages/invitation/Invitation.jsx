import { useEffect, useRef } from 'react'
import Deck from './Deck.jsx'

// Background music for the invitation only.
//
// iOS Safari only routes audio to the speaker when play() is called *inside* a
// genuine user gesture. The source must therefore be set SYNCHRONOUSLY up front
// (an earlier async fetch meant play() ran after the gesture had passed, so iOS
// kept it playing silently). We set the src on mount and start playback on the
// first tap/scroll. Fades in to a soft level (desktop/Android; iOS ignores the
// volume property and plays at device volume). No on-screen control by design.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const MUSIC_SRC = `${API_BASE}/api/music`
const TARGET_VOLUME = 0.35

export default function Invitation() {
  const rampRef = useRef(null)

  useEffect(() => {
    let started = false
    let wantPlaying = true
    const audio = new Audio()
    audio.src = MUSIC_SRC // set synchronously so play() can run inside a gesture
    audio.loop = true
    audio.preload = 'auto'
    // Start at the soft target level (not 0): on iOS the volume property is
    // ignored anyway, and starting at 0 risked a silent first second elsewhere.
    audio.volume = TARGET_VOLUME

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

    // Start audibly on the first real user gesture (the only reliable iOS path).
    const events = ['touchend', 'click', 'keydown']
    const onGesture = () => {
      if (started) return
      started = true
      events.forEach((e) => window.removeEventListener(e, onGesture))
      audio.play().catch(() => {})
    }
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))

    // Pause when the screen locks / tab is hidden; resume when visible again.
    const onVisibility = () => {
      if (document.hidden) {
        clearRamp()
        audio.pause()
      } else if (started && wantPlaying && audio.paused) {
        audio.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Leaving the page: gentle fade-out, then stop.
    return () => {
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
