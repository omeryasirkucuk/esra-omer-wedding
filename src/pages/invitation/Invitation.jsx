import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Cover from './Cover.jsx'
import Deck from './Deck.jsx'

// Drop your track at public/music/song.mp3 — it plays only on this page,
// fading in gently, with no on-screen control by design.
const MUSIC_SRC = '/music/song.mp3'

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
        const target = 0.8
        const step = target / 50
        const id = setInterval(() => {
          if (!audioRef.current) return clearInterval(id)
          const next = Math.min(target, audioRef.current.volume + step)
          audioRef.current.volume = next
          if (next >= target) clearInterval(id)
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
