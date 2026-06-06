// "Foto Tahmin": a small multiple-choice game over a few rounds. Each round shows
// a placeholder tile (where a real couple photo will go) and asks a "which
// year / where" style question. Gentle correct/total tally at the end.
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../lib/api.js'
import GameShell from '../GameShell.jsx'
import GameOverActions from '../GameOverActions.jsx'
import { useScoreSubmit } from '../useScoreSubmit.js'
import EndScoreboard from '../EndScoreboard.jsx'
import { displayUrl } from '../../../lib/mediaActions.js'

// A soft gradient used as a placeholder tile when a round has no image.
const FALLBACK_GRADIENT = 'linear-gradient(135deg,#eef0e6,#e6e4d4 60%,#e9ddc6)'

// Bundled fallback rounds, used when nothing is stored yet. These use gradient
// placeholders (no real photos) and a `prompt` for the question text.
const defaultRounds = [
  {
    prompt: 'Bu fotoğraf hangi yıl çekildi?',
    gradient: 'linear-gradient(135deg,#eef0e6,#e6e4d4 60%,#e9ddc6)',
    options: ['2019', '2021', '2022', '2023'],
    answerIndex: 1,
  },
  {
    prompt: 'Bu kare nerede çekildi?',
    gradient: 'linear-gradient(135deg,#f3e6ec,#e9d9e0 60%,#e6ddc8)',
    options: ['İstanbul', 'İzmir', 'Bodrum', 'Kapadokya'],
    answerIndex: 3,
  },
  {
    prompt: 'Bu fotoğraf hangi mevsimde çekildi?',
    gradient: 'linear-gradient(135deg,#e7eef0,#d9e4e6 60%,#dde6cf)',
    options: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'],
    answerIndex: 0,
  },
  {
    prompt: 'Bu anı hangi etkinlikten?',
    gradient: 'linear-gradient(135deg,#f0ece2,#e6dcc8 60%,#ecd9d9)',
    options: ['Doğum günü', 'Tatil', 'Söz', 'Konser'],
    answerIndex: 2,
  },
]

// Map a stored round ({ imageUrl, question, options, answerIndex }) to the shape
// the component renders. Keeps `prompt` and a `gradient` fallback for rounds
// without an image.
function fromStored(item) {
  return {
    imageUrl: item.imageUrl || '',
    prompt: item.question || '',
    gradient: FALLBACK_GRADIENT,
    options: Array.isArray(item.options) ? item.options : [],
    answerIndex: typeof item.answerIndex === 'number' ? item.answerIndex : 0,
  }
}

export default function PhotoGuess() {
  const [rounds, setRounds] = useState(defaultRounds)

  // Prefer stored content; fall back to the bundled defaults on empty/error.
  useEffect(() => {
    let alive = true
    api
      .getGamesContent()
      .then((d) => {
        if (!alive) return
        if (Array.isArray(d?.photoGuess) && d.photoGuess.length > 0) {
          setRounds(d.photoGuess.map(fromStored))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const total = rounds.length
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  // Per-round record for the scoreboard detail payload.
  const [answers, setAnswers] = useState([])

  const current = rounds[index]
  const answered = selected !== null

  // Holds the auto-advance timeout id so it can be cleared on unmount/restart.
  const advanceTimer = useRef(null)

  // Clear any pending auto-advance timer when the component unmounts.
  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  // Result label shared by the score submission and the end scoreboard.
  const resultLabel = `${correct}/${total} doğru`

  // Submit the final result exactly once when the game ends.
  useScoreSubmit(done, () => ({
    game: 'foto-tahmin',
    score: correct,
    label: resultLabel,
    detail: answers,
  }))

  const restart = () => {
    clearTimeout(advanceTimer.current)
    setIndex(0)
    setSelected(null)
    setCorrect(0)
    setDone(false)
    setAnswers([])
  }

  const choose = (i) => {
    if (answered) return
    setSelected(i)
    const ok = i === current.answerIndex
    if (ok) setCorrect((c) => c + 1)
    setAnswers((prev) => [
      ...prev,
      {
        soru: current.prompt,
        cevap: current.options[i],
        dogru: current.options[current.answerIndex],
        ok,
      },
    ])
    // Reveal styling, lock taps, then auto-advance after ~1.5s.
    advanceTimer.current = setTimeout(() => {
      if (index + 1 >= total) {
        setDone(true)
      } else {
        setIndex((n) => n + 1)
        setSelected(null)
      }
    }, 1500)
  }

  if (done) {
    return (
      <GameShell label="Bil bakalım" title="Foto Tahmin">
        <div className="text-center mt-4 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl md:text-3xl">
            Bitti
          </p>
          <EndScoreboard game="foto-tahmin" myLabel={resultLabel} />
          <GameOverActions onRestart={restart} />
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell label="Bil bakalım" title="Foto Tahmin">
      <p className="label text-center">
        {index + 1}/{total}
      </p>
      {current.imageUrl ? (
        <img
          src={displayUrl(current.imageUrl)}
          alt=""
          className="w-full max-w-xs md:max-w-sm aspect-[4/3] md:max-h-72 object-cover rounded-2xl border border-[#e2d6b8] mt-3 md:mt-4"
        />
      ) : (
        <div
          className="w-full max-w-xs md:max-w-sm aspect-[4/3] md:max-h-72 rounded-2xl border border-[#e2d6b8] mt-3 md:mt-4 flex items-center justify-center text-gold text-3xl md:text-4xl"
          style={{ background: current.gradient }}
          aria-hidden="true"
        >
          ❀
        </div>
      )}
      <h2 className="font-display text-primary text-xl md:text-2xl text-center mt-5 md:mt-7">
        {current.prompt}
      </h2>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mt-5 md:mt-7 w-full max-w-xs md:max-w-md">
        {current.options.map((opt, i) => {
          const isCorrect = i === current.answerIndex
          const isPicked = i === selected
          let style
          if (answered && isCorrect) {
            style = { background: '#5f9c63', color: '#fff', borderColor: '#4f8a54' }
          } else if (answered && isPicked && !isCorrect) {
            style = { background: 'var(--c-rose)', color: '#fff', borderColor: 'var(--c-rose)' }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              style={style}
              className="card-soft px-3 py-3 md:px-5 md:py-4 font-display text-lg md:text-xl text-ink transition-colors"
            >
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="eo-advance-track mt-7"><span /></div>
      )}
    </GameShell>
  )
}
