import { useEffect, useState } from 'react'
import Deck from './Deck.jsx'
import Cover from './Cover.jsx'
import { bindInvitationMusic, primeMusic, isPrimed } from '../../lib/music.js'

// Background music plays only on the invitation.
// - QR/home flow: the home "Davetiye" tap unlocks the music (primeMusic) and it
//   is carried here, so we open straight into the deck.
// - Direct visit (shared link): no prior gesture exists, so we show a one-tap
//   cover; tapping it starts the music in a real gesture (the only way browsers
//   allow audio) and opens the deck.
export default function Invitation() {
  const [open, setOpen] = useState(() => isPrimed())

  useEffect(() => {
    if (!open) return undefined
    return bindInvitationMusic()
  }, [open])

  if (!open) {
    return (
      <Cover
        onOpen={() => {
          primeMusic() // starts the paused audio inside this tap → audible
          setOpen(true)
        }}
      />
    )
  }
  return <Deck />
}
