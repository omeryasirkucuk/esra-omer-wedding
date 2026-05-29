// The /oyunlar landing grid: a calm, fine-stationery menu of small games guests
// can play while they wait for the ceremony. No scores, no ranking — just fun.
import { Link } from 'react-router-dom'
import Emblem from '../../components/Emblem.jsx'

// Each tile maps to a route at /oyunlar/<id>. `symbol` is a small font-display
// glyph shown inside a gold medallion.
const games = [
  { id: 'eslestirme', name: 'Hafıza', descriptor: 'Eşleştirme', symbol: '✿' },
  { id: 'cifti-tani', name: 'Çifti Tanı', descriptor: 'Quiz', symbol: '?' },
  { id: 'foto-tahmin', name: 'Foto Tahmin', descriptor: 'Bil bakalım', symbol: '◐' },
  { id: 'yapboz', name: 'Yapboz', descriptor: 'Slide puzzle', symbol: '⊞' },
  { id: 'kim-demis', name: 'Kim Demiş?', descriptor: 'Esra mı Ömer mi', symbol: '❝' },
  { id: 'fark-bul', name: 'Farkı Bul', descriptor: 'Foto üstünde', symbol: '✦' },
]

export default function GamesHub() {
  return (
    <div className="paper min-h-[100svh] px-6 pt-8 pb-16 flex flex-col items-center">
      <Emblem size={48} linkHome />
      <p className="label mt-4">Eğlence Köşesi</p>
      <h1 className="font-display italic text-primary text-2xl text-center mt-2 leading-snug max-w-xs">
        Tören başlayana dek keyifli vakit geçirin
      </h1>

      <div className="grid grid-cols-2 gap-4 mt-9 w-full max-w-md">
        {games.map((g) => (
          <Link
            key={g.id}
            to={`/oyunlar/${g.id}`}
            className="card-soft no-underline flex flex-col items-center text-center px-3 py-6 transition-transform active:translate-y-px hover:-translate-y-0.5"
          >
            <span className="w-10 h-10 rounded-full border border-gold flex items-center justify-center font-display text-primary text-lg">
              {g.symbol}
            </span>
            <span className="font-display text-primary text-xl mt-3">{g.name}</span>
            <span className="label mt-1">{g.descriptor}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
