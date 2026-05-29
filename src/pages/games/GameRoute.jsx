// Resolves the :gameId route param to a game component. Unknown ids fall back
// to a graceful "this game is being prepared" card.
import { useParams, Link } from 'react-router-dom'
import Emblem from '../../components/Emblem.jsx'
import Memory from './games/Memory.jsx'
import Quiz from './games/Quiz.jsx'
import PhotoGuess from './games/PhotoGuess.jsx'
import SlidePuzzle from './games/SlidePuzzle.jsx'
import WhoSaid from './games/WhoSaid.jsx'
import SpotDifference from './games/SpotDifference.jsx'

const registry = {
  eslestirme: Memory,
  'cifti-tani': Quiz,
  'foto-tahmin': PhotoGuess,
  yapboz: SlidePuzzle,
  'kim-demis': WhoSaid,
  'fark-bul': SpotDifference,
}

export default function GameRoute() {
  const { gameId } = useParams()
  const Game = registry[gameId]

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
