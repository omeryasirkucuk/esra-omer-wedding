import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Cover from './Cover.jsx'
import Deck from './Deck.jsx'

// Track is served from the bucket via /api/music (presigned). It plays only on
// this page, fading in gently to a low background level, with no on-screen
// control by design.
const MUSIC_SRC = (import.meta.env.VITE_API_BASE || '') + '/api/music'
// Soft background level — present but never loud.
const TARGET_VOLUME = 0.35

export default function Invitation() {
  const [opened, setOpened] = useState(false)
  const audioRef = useRef(null)

  // Gentle 0 → 0.8 volume ramp over ~5s after the user opens the invitation
  // (autoplay needs that gesture).
  const startMusic = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0
    audio.loop = true
    audio.play().then(
      () => {
        // Gentle ~6s ramp from silence up to a soft background level.
        const step = TARGET_VOLUME / 60
        const id = setInterval(() => {
          if (!audioRef.current) return clearInterval(id)
          const next = Math.min(TARGET_VOLUME, audioRef.current.volume + step)
          audioRef.current.volume = next
          if (next >= TARGET_VOLUME) clearInterval(id)
        }, 100)
      },
      () => {
        /* autoplay blocked or no file yet — invitation still works silently */
      },
    )
  }

  const open = () => {
    setOpened(true)
    startMusic()
  }

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" />
      {opened ? (
        <Deck />
      ) : (
        <AnimatePresence>
          <Cover onOpen={open} />
        </AnimatePresence>
      )}
    </>
  )
}
