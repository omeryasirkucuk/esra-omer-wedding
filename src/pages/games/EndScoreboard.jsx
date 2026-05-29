// Shown on a single game's end screen (replaces the old standalone scoreboard
// and the "view scoreboard" link). Renders the player's own result big, then
// that game's leaderboard — best score per player, ranked, with the current
// player's row highlighted. On-brand: ivory/gold/dusty-blue, font-display.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Sprig from '../../components/Sprig.jsx'
import { api } from '../../lib/api.js'
import { getUploaderId } from '../../lib/identity.js'

const TOP_N = 10
// One delayed re-fetch so the just-submitted score is reflected even if the
// first request raced ahead of the POST landing.
const REFETCH_DELAY_MS = 1200

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

export default function EndScoreboard({ game, myLabel }) {
  const [scores, setScores] = useState(null) // null = loading
  const [error, setError] = useState(false)
  const myId = getUploaderId()

  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .getScores()
        .then((d) => {
          if (alive) setScores(Array.isArray(d) ? d : d?.scores || [])
        })
        .catch(() => {
          if (alive) setError(true)
        })
    load()
    // Re-fetch once shortly after mount so a just-submitted score appears.
    const t = setTimeout(load, REFETCH_DELAY_MS)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [])

  // Full ranking (best-per-player, score desc) so the current player's REAL
  // rank is known even when they fall outside the visible top list.
  const ranked =
    scores === null
      ? []
      : bestPerPlayer(scores.filter((s) => s && s.game === game)).sort(
          (a, b) => (b.score ?? 0) - (a.score ?? 0)
        )

  const rows = ranked.slice(0, TOP_N)

  // 0-based index of the current player in the full ranking, or -1 if absent.
  const myRankIndex = ranked.findIndex((r) => r.uploaderId === myId)
  const inTop = myRankIndex !== -1 && myRankIndex < TOP_N
  // When the player ranked but fell outside the top list, surface their own
  // row below a separator so they still see exactly where they stand.
  const myRow = myRankIndex !== -1 && !inTop ? ranked[myRankIndex] : null

  return (
    <div className="text-left mt-7 w-full max-w-md md:max-w-lg mx-auto">
      {/* Your own result, big. */}
      <div className="text-center">
        <p className="label-gold">Senin skorun</p>
        <p className="font-display italic text-primary text-3xl md:text-4xl mt-1 lining-nums tabular-nums">
          {myLabel}
        </p>
      </div>

      <Sprig width={120} className="mx-auto mt-3" />

      {/* The game's leaderboard. */}
      <p className="label text-center mt-3">Sıralama</p>

      {scores === null && !error && (
        <p className="label text-center mt-4">Yükleniyor…</p>
      )}
      {error && (
        <p className="label text-center mt-4">Sıralama şu an yüklenemedi</p>
      )}

      {scores !== null && !error && rows.length === 0 && (
        <p className="label text-center mt-4">İlk sıralayan sen ol!</p>
      )}

      {rows.length > 0 && (
        <ol className="scroll-gold card-soft mt-3 px-4 py-3 md:px-6 md:py-4 max-h-[46svh] overflow-y-auto flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const isMe = row.uploaderId === myId
            return (
              <motion.li
                key={row.uploaderId || `${game}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.05 + i * 0.05 }}
                className={`flex items-baseline justify-between gap-3 rounded-lg px-2 py-1 font-display text-base md:text-lg ${
                  isMe ? 'text-primary' : 'text-primary/90'
                }`}
                style={isMe ? { background: 'var(--c-gold-soft, rgba(190,160,90,0.14))' } : undefined}
              >
                <span className="truncate flex items-baseline gap-1.5">
                  <span className="lining-nums tabular-nums">{i + 1}.</span>
                  <span className="truncate">{row.displayName || 'Misafir'}</span>
                  {isMe && (
                    <span className="label-gold shrink-0 not-italic">sen</span>
                  )}
                </span>
                <span className="label shrink-0 lining-nums tabular-nums">
                  {row.label || row.score}
                </span>
              </motion.li>
            )
          })}

          {/* Player outside the top list: a muted separator, then their own
              row at its REAL rank, highlighted like the in-list "me" row. */}
          {myRow && (
            <>
              <motion.li
                key="gap"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.32, delay: 0.05 + rows.length * 0.05 }}
                className="text-center text-muted font-display tracking-[0.4em] select-none py-0.5"
              >
                ⋯
              </motion.li>
              <motion.li
                key={myRow.uploaderId || 'me'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.1 + rows.length * 0.05 }}
                className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1 font-display text-base md:text-lg text-primary"
                style={{ background: 'var(--c-gold-soft, rgba(190,160,90,0.14))' }}
              >
                <span className="truncate flex items-baseline gap-1.5">
                  <span className="lining-nums tabular-nums">{myRankIndex + 1}.</span>
                  <span className="truncate">{myRow.displayName || 'Misafir'}</span>
                  <span className="label-gold shrink-0 not-italic">sen</span>
                </span>
                <span className="label shrink-0 lining-nums tabular-nums">
                  {myRow.label || myRow.score}
                </span>
              </motion.li>
            </>
          )}
        </ol>
      )}
    </div>
  )
}
