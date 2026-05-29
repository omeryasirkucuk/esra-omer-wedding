import { Link } from 'react-router-dom'

// Shown on every game's end screen: return home, back to the games list, or
// replay. "Tekrar Oyna" is the primary (filled) action.
export default function GameOverActions({ onRestart }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-7 justify-center items-stretch sm:items-center">
      <Link to="/" className="btn-lux no-underline">
        Ana Sayfa
      </Link>
      <Link to="/oyunlar" className="btn-lux no-underline">
        Oyunlar
      </Link>
      <button
        type="button"
        onClick={onRestart}
        className="btn-lux"
        style={{ background: 'var(--c-primary)', color: '#fffdf8', borderColor: 'var(--c-primary)' }}
      >
        Tekrar Oyna
      </button>
    </div>
  )
}
