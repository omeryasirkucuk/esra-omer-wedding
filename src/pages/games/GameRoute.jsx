// Resolves the :gameId route param to a game component. Unknown ids fall back
// to a graceful "this game is being prepared" card.
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Emblem from '../../components/Emblem.jsx'
import IdentityPrompt from '../../components/IdentityPrompt.jsx'
import { hasProfile } from '../../lib/identity.js'
import Memory from './games/Memory.jsx'
import Quiz from './games/Quiz.jsx'
import PhotoGuess from './games/PhotoGuess.jsx'
import SlidePuzzle from './games/SlidePuzzle.jsx'
import WhoSaid from './games/WhoSaid.jsx'
import Scoreboard from './Scoreboard.jsx'

const registry = {
  eslestirme: Memory,
  'cifti-tani': Quiz,
  'foto-tahmin': PhotoGuess,
  yapboz: SlidePuzzle,
  'kim-demis': WhoSaid,
  skor: Scoreboard,
}

export default function GameRoute() {
  const { gameId } = useParams()
  const Game = registry[gameId]
  // Bump to re-render once a profile is saved via the identity prompt.
  const [, forceRerender] = useState(0)

  // The scoreboard needs a name; ask once if we have none yet (shared via
  // localStorage, so any prior album/board entry already satisfies this).
  if (!hasProfile()) {
    return <IdentityPrompt onDone={() => forceRerender((n) => n + 1)} />
  }

  if (!Game) {
    return (
      <div className="paper min-h-[100svh] px-6 flex flex-col items-center justify-center text-center">
        <Emblem size={44} linkHome />
        <p className="font-display italic text-primary text-2xl mt-6">
          Bu oyun hazırlanıyor
        </p>
        <Link to="/oyunlar" className="btn-lux no-underline mt-7">
          Oyunlara Dön
        </Link>
      </div>
    )
  }

  return <Game />
}
