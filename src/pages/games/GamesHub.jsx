// The /oyunlar landing grid: a calm, fine-stationery menu of small games guests
// can play while they wait for the ceremony. No scores, no ranking — just fun.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Emblem from '../../components/Emblem.jsx'
import IdentityPrompt from '../../components/IdentityPrompt.jsx'
import { hasProfile } from '../../lib/identity.js'
import { useSite } from '../../lib/siteContent.jsx'
import { useEnabledGames, isGameEnabled } from './useEnabledGames.js'

// Each tile maps to a route at /oyunlar/<id>. `symbol` is a small font-display
// glyph shown inside a gold medallion.
// `descLang` marks descriptors that are English words so the uppercase label
// uses English casing (QUIZ, not QUİZ) instead of Turkish.
// The Kim Demiş descriptor names the couple, so it is built from site content.
const buildGames = (bride, groom) => [
  { id: 'eslestirme', name: 'Hafıza', descriptor: 'Eşleştirme', symbol: '✿' },
  { id: 'cifti-tani', name: 'Çifti Tanı', descriptor: 'Quiz', symbol: '?', descLang: 'en' },
  { id: 'foto-tahmin', name: 'Foto Tahmin', descriptor: 'Bil bakalım', symbol: '◐' },
  { id: 'yapboz', name: 'Yapboz', descriptor: 'Slide puzzle', symbol: '⊞', descLang: 'en' },
  { id: 'kim-demis', name: 'Kim Demiş?', descriptor: `${bride} mı ${groom} mi`, symbol: '❝' },
]

// Grid shape adapts to however many games are switched on, so the layout never
// ends with a lonely orphan row (4 tiles → 2x2, not 3+1). Tailwind needs the
// class strings literal, hence the lookup instead of computed names.
function gridLayout(count) {
  if (count === 1) return 'grid-cols-1 max-w-[13rem]'
  if (count === 2 || count === 4) return 'grid-cols-2 max-w-md'
  return 'grid-cols-2 md:grid-cols-3 max-w-md md:max-w-2xl'
}

export default function GamesHub() {
  const { bride, groom } = useSite()
  const enabledMap = useEnabledGames()
  // Until the flags load, render no tiles rather than all of them — a tile
  // flashing in and then vanishing reads as a glitch.
  const games = enabledMap
    ? buildGames(bride, groom).filter((g) => isGameEnabled(enabledMap, g.id))
    : []
  // Bump to re-render once a profile is saved via the identity prompt.
  const [, forceRerender] = useState(0)

  // Scores need a name; ask once (shared via localStorage across the site).
  if (!hasProfile()) {
    return <IdentityPrompt onDone={() => forceRerender((n) => n + 1)} />
  }

  return (
    <div className="paper min-h-[100svh] px-6 pt-10 pb-16 flex flex-col items-center">
      <Emblem className="w-12 md:w-16" linkHome />
      <p className="label mt-4">Eğlence Köşesi</p>
      <h1 className="font-display italic text-primary text-2xl md:text-4xl text-center mt-2 leading-snug max-w-xs md:max-w-xl">
        Tören başlayana dek keyifli vakit geçirin
      </h1>

      <div className={`grid gap-4 md:gap-5 mt-9 w-full ${gridLayout(games.length)}`}>
        {games.map((g) => (
          <Link
            key={g.id}
            to={`/oyunlar/${g.id}`}
            className="card-soft no-underline flex flex-col items-center text-center px-3 py-6 md:py-8 transition-transform active:translate-y-px hover:-translate-y-0.5"
          >
            <span className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gold flex items-center justify-center font-display text-primary text-lg md:text-xl">
              {g.symbol}
            </span>
            <span className="font-display text-primary text-xl md:text-2xl mt-3">{g.name}</span>
            <span className="label mt-1" lang={g.descLang}>
              {g.descriptor}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
