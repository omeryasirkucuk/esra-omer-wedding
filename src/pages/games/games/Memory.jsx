// Memory / concentration ("Hafıza"): a 4x4 grid of 8 matched pairs. Players flip
// two cards at a time; matched pairs stay revealed. Tracks moves, matches and
// elapsed time. No scoring economy — just a gentle "Tebrikler!" on completion.
import { useCallback, useEffect, useMemo, useState } from 'react'
import GameShell from '../GameShell.jsx'

// TODO: swap symbol faces for couple photo thumbnails when provided.
const FACES = ['🌿', '💍', '🤍', '🕊️', '🌸', '✨', '🥂', '💐']

function buildDeck() {
  const cards = FACES.flatMap((face, i) => [
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
  const [deck, setDeck] = useState(buildDeck)
  const [flipped, setFlipped] = useState([]) // indexes currently face-up (unmatched)
  const [matched, setMatched] = useState([]) // pairIds already solved
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)

  const won = matched.length === FACES.length

  // Elapsed-time ticker, runs only while playing.
  useEffect(() => {
    if (!started || won) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [started, won])

  const reset = useCallback(() => {
    setDeck(buildDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setLocked(false)
    setSeconds(0)
    setStarted(false)
  }, [])

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
      <div className="flex items-center justify-center gap-5 label">
        <span>Hamle {moves}</span>
        <span>Eşleşme {matched.length}/{FACES.length}</span>
        <span>Süre {formatTime(seconds)}</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 mt-6 w-full max-w-xs mx-auto">
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
          <p className="label mt-1">
            {moves} hamle · {formatTime(seconds)}
          </p>
          <button type="button" onClick={reset} className="btn-lux mt-5">
            Tekrar Oyna
          </button>
        </div>
      )}
    </GameShell>
  )
}

// A single flip card. The 3D flip is pure CSS via inline transform styles so no
// extra global stylesheet is needed.
function MemoryCard({ face, shown, onFlip }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={shown ? face : 'Kapalı kart'}
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
          className="absolute inset-0 rounded-lg border border-gold flex items-center justify-center text-rose"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg,#f4ecdd,#efe6d4)',
          }}
        >
          ❀
        </span>
        {/* Front: pair face */}
        <span
          className="absolute inset-0 rounded-lg border border-gold flex items-center justify-center text-2xl card-soft"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {face}
        </span>
      </span>
    </button>
  )
}
