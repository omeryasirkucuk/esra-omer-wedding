// Memory / concentration ("Hafıza"): a 4x4 grid of 8 matched pairs. Players flip
// two cards at a time; matched pairs stay revealed. Tracks moves, matches and
// elapsed time. No scoring economy — just a gentle "Tebrikler!" on completion.
import { useCallback, useEffect, useState } from 'react'
import GameShell from '../GameShell.jsx'
import GameOverActions from '../GameOverActions.jsx'
import { useScoreSubmit } from '../useScoreSubmit.js'
import EndScoreboard from '../EndScoreboard.jsx'
import { api } from '../../../lib/api.js'
import { displayUrl } from '../../../lib/mediaActions.js'

const PAIR_COUNT = 8 // 4x4 board = 8 pairs

// Default symbol faces, used when the couple hasn't uploaded 8 photos yet.
const DEFAULT_FACES = ['🌿', '💍', '🤍', '🕊️', '🌸', '✨', '🥂', '💐']

// Build exactly PAIR_COUNT faces: use whatever photos the couple has uploaded
// (in order) and top up the remaining pairs with default symbols, so the 4x4
// board always works — even with just one photo, or none at all. Each face
// carries a `type` so the card knows whether to render an <img> or text.
function resolveFaces(memory) {
  const urls = Array.isArray(memory) ? memory.filter((u) => typeof u === 'string' && u) : []
  const faces = urls.slice(0, PAIR_COUNT).map((url) => ({ type: 'image', value: url }))
  for (let i = 0; faces.length < PAIR_COUNT; i++) {
    faces.push({ type: 'symbol', value: DEFAULT_FACES[i % DEFAULT_FACES.length] })
  }
  return faces
}

function buildDeck(faces) {
  const cards = faces.flatMap((face, i) => [
    { id: `${i}a`, face, pairId: i },
    { id: `${i}b`, face, pairId: i },
  ])
  // Fisher–Yates shuffle.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function Memory() {
  const [faces, setFaces] = useState(() => resolveFaces(null))
  const [deck, setDeck] = useState(() => buildDeck(resolveFaces(null)))
  const [flipped, setFlipped] = useState([]) // indexes currently face-up (unmatched)
  const [matched, setMatched] = useState([]) // pairIds already solved
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)

  const won = matched.length === PAIR_COUNT

  // On mount, load saved photo faces; rebuild the deck if 8 photos are present.
  useEffect(() => {
    let alive = true
    api
      .getGamesContent()
      .then((d) => {
        if (!alive) return
        const next = resolveFaces(d?.memory)
        setFaces(next)
        setDeck(buildDeck(next))
      })
      .catch(() => {
        // Keep the default faces already in state on failure.
      })
    return () => {
      alive = false
    }
  }, [])

  // Result label shared by the score submission and the end scoreboard.
  const resultLabel = `${moves} hamle · ${formatTime(seconds)}`

  // Submit the final result exactly once on completion. Higher is better:
  // fewer moves and less time keep the score up.
  useScoreSubmit(won, () => ({
    game: 'eslestirme',
    score: Math.max(0, 1000 - moves * 10 - seconds * 2),
    label: resultLabel,
    detail: { hamle: moves, saniye: seconds },
  }))

  // Elapsed-time ticker, runs only while playing.
  useEffect(() => {
    if (!started || won) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [started, won])

  const reset = useCallback(() => {
    setDeck(buildDeck(faces))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setLocked(false)
    setSeconds(0)
    setStarted(false)
  }, [faces])

  const onFlip = (index) => {
    if (locked || flipped.includes(index)) return
    if (matched.includes(deck[index].pairId)) return
    if (!started) setStarted(true)

    const next = [...flipped, index]
    setFlipped(next)

    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next
      if (deck[a].pairId === deck[b].pairId) {
        setMatched((prev) => [...prev, deck[a].pairId])
        setFlipped([])
      } else {
        setLocked(true)
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 800)
      }
    }
  }

  const isShown = (index) =>
    flipped.includes(index) || matched.includes(deck[index].pairId)

  return (
    <GameShell label="Eşleştirme" title="Hafıza">
      <div className="flex items-center justify-center gap-5 md:gap-8 label md:text-[0.7rem]">
        <span>Hamle {moves}</span>
        <span>Eşleşme {matched.length}/{PAIR_COUNT}</span>
        <span>Süre {formatTime(seconds)}</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 md:gap-4 mt-6 md:mt-8 w-full max-w-xs md:max-w-md mx-auto">
        {deck.map((card, index) => (
          <MemoryCard
            key={card.id}
            face={card.face}
            shown={isShown(index)}
            onFlip={() => onFlip(index)}
          />
        ))}
      </div>

      {won && (
        <div className="text-center mt-8 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl">Tebrikler!</p>
          <EndScoreboard game="eslestirme" myLabel={resultLabel} />
          <GameOverActions onRestart={reset} />
        </div>
      )}
    </GameShell>
  )
}

// A single flip card. The 3D flip is pure CSS via inline transform styles so no
// extra global stylesheet is needed. `face` is { type: 'image' | 'symbol', value }.
function MemoryCard({ face, shown, onFlip }) {
  const isImage = face.type === 'image'
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={shown ? (isImage ? 'Açık kart' : face.value) : 'Kapalı kart'}
      className="relative aspect-square"
      style={{ perspective: '600px' }}
    >
      <span
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease',
          transform: shown ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back: floral motif color */}
        <span
          className="absolute inset-0 rounded-lg md:rounded-xl border border-gold flex items-center justify-center text-rose md:text-xl"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg,#f4ecdd,#efe6d4)',
          }}
        >
          ❀
        </span>
        {/* Front: pair face — photo when provided, else symbol */}
        <span
          className="absolute inset-0 rounded-lg md:rounded-xl border border-gold flex items-center justify-center text-2xl md:text-4xl card-soft overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {isImage ? (
            <img src={displayUrl(face.value)} alt="" className="w-full h-full object-cover" />
          ) : (
            face.value
          )}
        </span>
      </span>
    </button>
  )
}
