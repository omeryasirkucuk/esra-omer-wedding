// "Skor Tablosu": per-game leaderboards. Fetches every recorded score on mount,
// groups by game, and — because replaying adds a new entry each time — keeps
// only each player's BEST score per game before ranking. (The admin panel still
// sees every individual attempt.) On-brand, scrollable, mobile + desktop.
import { useEffect, useState } from 'react'
import GameShell from './GameShell.jsx'
import { api } from '../../lib/api.js'

// Display order + Turkish headings for each game id.
const GAME_NAMES = {
  eslestirme: 'Hafıza',
  'cifti-tani': 'Çifti Tanı',
  'foto-tahmin': 'Foto Tahmin',
  yapboz: 'Yapboz',
  'kim-demis': 'Kim Demiş?',
}

const TOP_N = 8

export default function Scoreboard() {
  const [scores, setScores] = useState(null) // null = loading
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .getScores()
      .then((d) => {
        if (alive) setScores(Array.isArray(d) ? d : d?.scores || [])
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <GameShell label="Skor Tablosu" title="Skorlar">
      {scores === null && !error && (
        <p className="label mt-6">Yükleniyor…</p>
      )}
      {error && <p className="label mt-6">Skorlar şu an yüklenemedi</p>}
      {scores !== null && !error && <Boards scores={scores} />}
    </GameShell>
  )
}

// Keep only each player's best attempt (highest score; newest on a tie), so a
// player who replays appears once with their best result.
function bestPerPlayer(list) {
  const map = new Map()
  for (const s of list) {
    const key = s.uploaderId || `name:${s.displayName || ''}`
    const prev = map.get(key)
    const better =
      !prev ||
      (s.score ?? 0) > (prev.score ?? 0) ||
      ((s.score ?? 0) === (prev.score ?? 0) &&
        Date.parse(s.createdAt || 0) > Date.parse(prev.createdAt || 0))
    if (better) map.set(key, s)
  }
  return [...map.values()]
}

function Boards({ scores }) {
  // Group by game, then take the highest TOP_N per game (score descending).
  const byGame = {}
  for (const s of scores) {
    if (!s || !s.game) continue
    ;(byGame[s.game] ||= []).push(s)
  }

  const sections = Object.keys(GAME_NAMES)
    .map((id) => ({
      id,
      name: GAME_NAMES[id],
      rows: bestPerPlayer(byGame[id] || [])
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, TOP_N),
    }))
    .filter((sec) => sec.rows.length > 0)

  if (sections.length === 0) {
    return (
      <p className="label mt-6 text-center">
        Henüz skor yok — bir oyun oyna, ilk sen ol!
      </p>
    )
  }

  return (
    <div className="scroll-gold w-full max-h-[70svh] overflow-y-auto pr-1 mt-2 flex flex-col gap-7">
      {sections.map((sec) => (
        <section key={sec.id} className="w-full">
          <p className="label-gold text-center">{sec.name}</p>
          <ol className="card-soft mt-2 px-4 py-3 md:px-6 md:py-4 flex flex-col gap-1.5">
            {sec.rows.map((row, i) => (
              <li
                key={`${sec.id}-${i}`}
                className="flex items-baseline justify-between gap-3 font-display text-primary text-base md:text-lg"
              >
                <span className="truncate">
                  {i + 1}. {row.displayName || 'Misafir'}
                </span>
                <span className="label shrink-0">{row.label || row.score}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
