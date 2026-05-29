// "Yapboz": a classic 3x3 sliding tile puzzle over an emoji/gradient placeholder.
// Tiles numbered 1–8 with one empty slot; tap a tile adjacent to the gap to slide
// it. Detects the solved order and shows "Tamamlandı!".
import { useCallback, useState } from 'react'
import GameShell from '../GameShell.jsx'

const SIZE = 3
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0] // 0 is the empty slot

// TODO: replace the tile gradient with a sliced couple photo when available.
const TILE_GRADIENT = 'linear-gradient(135deg,#f4ecdd,#e9d9e0 60%,#dde6cf)'

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
  const solved = isSolved(tiles)

  const move = (i) => {
    if (solved) return
    const empty = tiles.indexOf(0)
    if (!neighbors(i).includes(empty)) return
    const next = [...tiles]
    ;[next[empty], next[i]] = [next[i], next[empty]]
    setTiles(next)
  }

  const reset = useCallback(() => setTiles(shuffle()), [])

  return (
    <GameShell label="Slide puzzle" title="Yapboz">
      <p className="label text-center">Taşları kaydırarak sırala</p>

      <div className="grid grid-cols-3 gap-2 mt-5 w-full max-w-[16rem] mx-auto">
        {tiles.map((tile, i) =>
          tile === 0 ? (
            <span key={i} className="aspect-square rounded-lg" aria-hidden="true" />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => move(i)}
              className="aspect-square rounded-lg border border-gold font-display text-primary text-2xl flex items-center justify-center transition-transform active:scale-95"
              style={{ background: TILE_GRADIENT }}
            >
              {tile}
            </button>
          )
        )}
      </div>

      {solved ? (
        <div className="text-center mt-7 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl">Tamamlandı!</p>
          <button type="button" onClick={reset} className="btn-lux mt-5">
            Tekrar Oyna
          </button>
        </div>
      ) : (
        <button type="button" onClick={reset} className="btn-lux mt-7">
          Karıştır
        </button>
      )}
    </GameShell>
  )
}
