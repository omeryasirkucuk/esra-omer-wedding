import { useEffect } from 'react'
import Deck from './Deck.jsx'
import { bindInvitationMusic } from '../../lib/music.js'

// Background music plays only on the invitation. It is unlocked inside the home
// "Davetiye" tap (see primeMusic) and carried here by a persistent audio element
// — so on the normal QR/home flow it plays seamlessly. On a directly-shared
// /davetiye link it starts on the guest's first in-page tap (iOS requires a real
// gesture; a synthetic click cannot unlock audio). See src/lib/music.js.
export default function Invitation() {
  useEffect(() => bindInvitationMusic(), [])
  return <Deck />
}
