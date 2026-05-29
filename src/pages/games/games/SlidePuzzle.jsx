// "Yapboz": a classic 3x3 sliding tile puzzle over an emoji/gradient placeholder.
// Tiles numbered 1–8 with one empty slot; tap a tile adjacent to the gap to slide
// it. Detects the solved order and shows "Tamamlandı!".
import { useCallback, useEffect, useState } from 'react'
import GameShell from '../GameShell.jsx'
import GameOverActions from '../GameOverActions.jsx'
import { useScoreSubmit } from '../useScoreSubmit.js'
import ScoreSubmitted from '../ScoreSubmitted.jsx'
import { api } from '../../../lib/api.js'

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

const SIZE = 3
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0] // 0 is the empty slot

const TILE_GRADIENT = 'linear-gradient(135deg,#f4ecdd,#e9d9e0 60%,#dde6cf)'

// Compute the CSS background style that renders a given tile as the matching
// slice of the source image. `value` is the tile's solved number (1..8); its
// correct position is (value-1) in the SIZE×SIZE grid. Same-origin "/media/..."
// urls are used directly, no base prefix.
function tileImageStyle(value, imageUrl) {
  const pos = value - 1
  const row = Math.floor(pos / SIZE)
  const col = pos % SIZE
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${SIZE * 100}% ${SIZE * 100}%`,
    backgroundPosition: `${(col / (SIZE - 1)) * 100}% ${(row / (SIZE - 1)) * 100}%`,
  }
}

function isSolved(tiles) {
  return tiles.every((t, i) => t === SOLVED[i])
}

function shuffle() {
  // Apply many random legal moves so the board is always solvable.
  let tiles = [...SOLVED]
  let empty = tiles.indexOf(0)
  for (let n = 0; n < 200; n++) {
    const moves = neighbors(empty)
    const pick = moves[Math.floor(Math.random() * moves.length)]
    ;[tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]]
    empty = pick
  }
  return isSolved(tiles) ? shuffle() : tiles
}

function neighbors(i) {
  const row = Math.floor(i / SIZE)
  const col = i % SIZE
  const result = []
  if (row > 0) result.push(i - SIZE)
  if (row < SIZE - 1) result.push(i + SIZE)
  if (col > 0) result.push(i - 1)
  if (col < SIZE - 1) result.push(i + 1)
  return result
}

export default function SlidePuzzle() {
  const [tiles, setTiles] = useState(shuffle)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const solved = isSolved(tiles)

  // On mount, load the saved puzzle image; when set, tiles render as slices of
  // it. Falls back to the gradient placeholder when unset or on failure.
  useEffect(() => {
    let alive = true
    api
      .getGamesContent()
      .then((d) => {
        if (alive && d?.puzzle?.imageUrl) setImageUrl(d.puzzle.imageUrl)
      })
      .catch(() => {
        // Keep the gradient placeholder on failure.
      })
    return () => {
      alive = false
    }
  }, [])

  // Elapsed-time ticker, runs only while playing.
  useEffect(() => {
    if (!started || solved) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [started, solved])

  // Submit the final result exactly once on completion. Higher is better:
  // fewer moves and less time keep the score up.
  const submitted = useScoreSubmit(solved, () => ({
    game: 'yapboz',
    score: Math.max(0, 1000 - moves * 5 - seconds * 2),
    label: `${moves} hamle · ${formatTime(seconds)}`,
    detail: { hamle: moves, saniye: seconds },
  }))

  const move = (i) => {
    if (solved) return
    const empty = tiles.indexOf(0)
    if (!neighbors(i).includes(empty)) return
    if (!started) setStarted(true)
    const next = [...tiles]
    ;[next[empty], next[i]] = [next[i], next[empty]]
    setTiles(next)
    setMoves((m) => m + 1)
  }

  const reset = useCallback(() => {
    setTiles(shuffle())
    setMoves(0)
    setSeconds(0)
    setStarted(false)
  }, [])

  return (
    <GameShell label={<span lang="en">Slide puzzle</span>} title="Yapboz">
      <p className="label md:text-[0.7rem] text-center">Taşları kaydırarak sırala</p>

      <div className="flex items-center justify-center gap-5 md:gap-8 label md:text-[0.7rem] mt-3">
        <span>Hamle {moves}</span>
        <span>Süre {formatTime(seconds)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mt-5 md:mt-7 w-full max-w-[16rem] md:max-w-sm mx-auto">
        {tiles.map((tile, i) =>
          tile === 0 ? (
            <span key={i} className="aspect-square rounded-lg" aria-hidden="true" />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => move(i)}
              className="aspect-square rounded-lg md:rounded-xl border border-gold font-display text-primary text-2xl md:text-4xl flex items-center justify-center transition-transform active:scale-95 overflow-hidden"
              style={
                imageUrl
                  ? tileImageStyle(tile, imageUrl)
                  : { background: TILE_GRADIENT }
              }
            >
              {imageUrl ? '' : tile}
            </button>
          )
        )}
      </div>

      {solved ? (
        <div className="text-center mt-7 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl md:text-3xl">Tamamlandı!</p>
          <p className="label mt-1">
            {moves} hamle · {formatTime(seconds)}
          </p>
          <ScoreSubmitted submitted={submitted} />
          <GameOverActions onRestart={reset} />
        </div>
      ) : (
        <button type="button" onClick={reset} className="btn-lux md:text-[0.74rem] mt-7">
          Karıştır
        </button>
      )}
    </GameShell>
  )
}
