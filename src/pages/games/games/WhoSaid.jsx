// "Kim Demiş?": a quote is shown and the guest guesses who said it — Esra or
// Ömer. The correct answer is revealed, then "Sıradaki" advances. Gentle
// correct/total tally at the end. The couple can edit the quotes below.
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api.js'
import GameShell from '../GameShell.jsx'
import GameOverActions from '../GameOverActions.jsx'
import { useScoreSubmit } from '../useScoreSubmit.js'
import ScoreSubmitted from '../ScoreSubmitted.jsx'

// Bundled fallback quotes, used when nothing is stored yet. Each item carries a
// `who` display label ('Esra' | 'Ömer').
const defaultRounds = [
  { quote: 'Bir kahve daha içsek mi?', who: 'Esra' },
  { quote: 'Maçı kaçırmam, sonra konuşuruz.', who: 'Ömer' },
  { quote: 'Kediye yine ben mama verdim.', who: 'Esra' },
  { quote: 'Bu akşam yemeği ben yapayım.', who: 'Ömer' },
  { quote: 'Tatil planını çoktan hazırladım bile.', who: 'Esra' },
]

const PEOPLE = ['Esra', 'Ömer']

// Map a stored item ({ quote, answer: 'esra' | 'omer' }) to the display shape
// the component renders with ({ quote, who: 'Esra' | 'Ömer' }).
function fromStored(item) {
  return { quote: item.quote || '', who: item.answer === 'omer' ? 'Ömer' : 'Esra' }
}

export default function WhoSaid() {
  const [rounds, setRounds] = useState(defaultRounds)

  // Prefer stored content; fall back to the bundled defaults on empty/error.
  useEffect(() => {
    let alive = true
    api
      .getGamesContent()
      .then((d) => {
        if (!alive) return
        if (Array.isArray(d?.whoSaid) && d.whoSaid.length > 0) {
          setRounds(d.whoSaid.map(fromStored))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const total = rounds.length
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  // Per-quote record for the scoreboard detail payload.
  const [answers, setAnswers] = useState([])

  const current = rounds[index]
  const answered = picked !== null

  // Submit the final result exactly once when the game ends.
  const submitted = useScoreSubmit(done, () => ({
    game: 'kim-demis',
    score: correct,
    label: `${correct}/${total} doğru`,
    detail: answers,
  }))

  const restart = () => {
    setIndex(0)
    setPicked(null)
    setCorrect(0)
    setDone(false)
    setAnswers([])
  }

  const choose = (name) => {
    if (answered) return
    setPicked(name)
    const ok = name === current.who
    if (ok) setCorrect((c) => c + 1)
    setAnswers((prev) => [
      ...prev,
      { alinti: current.quote, cevap: name, dogru: current.who, ok },
    ])
  }

  const next = () => {
    if (index + 1 >= total) return setDone(true)
    setIndex((n) => n + 1)
    setPicked(null)
  }

  if (done) {
    return (
      <GameShell label="Esra mı Ömer mi" title="Kim Demiş?">
        <div className="text-center mt-4 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl md:text-3xl">
            Bitti — {correct}/{total} doğru
          </p>
          <ScoreSubmitted submitted={submitted} />
          <GameOverActions onRestart={restart} />
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell label="Esra mı Ömer mi" title="Kim Demiş?">
      <p className="label text-center">
        {index + 1}/{total}
      </p>

      <blockquote className="card-soft px-6 py-8 md:px-10 md:py-12 mt-4 md:mt-6 text-center font-display italic text-primary text-2xl md:text-3xl leading-snug">
        “{current.quote}”
      </blockquote>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8 w-full max-w-xs md:max-w-md">
        {PEOPLE.map((name) => {
          const isCorrect = name === current.who
          const isPicked = name === picked
          let style
          if (answered && isCorrect) {
            style = { background: 'var(--c-primary-soft)', color: '#fff', borderColor: 'var(--c-primary)' }
          } else if (answered && isPicked && !isCorrect) {
            style = { background: 'var(--c-rose)', color: '#fff', borderColor: 'var(--c-rose)' }
          }
          return (
            <button
              key={name}
              type="button"
              onClick={() => choose(name)}
              disabled={answered}
              style={style}
              className="card-soft px-4 py-3 md:px-6 md:py-4 font-display text-lg md:text-xl text-ink transition-colors"
            >
              {name}
            </button>
          )
        })}
      </div>

      {answered && (
        <button type="button" onClick={next} className="btn-lux md:text-[0.74rem] mt-6">
          {index + 1 >= total ? 'Bitir' : 'Sıradaki'}
        </button>
      )}
    </GameShell>
  )
}
