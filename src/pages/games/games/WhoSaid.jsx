// "Kim Demiş?": a quote is shown and the guest guesses who said it — Esra or
// Ömer. The correct answer is revealed, then "Sıradaki" advances. Gentle
// correct/total tally at the end. The couple can edit the quotes below.
import { useState } from 'react'
import GameShell from '../GameShell.jsx'

// TODO: replace these placeholder quotes with real ones from the couple.
const rounds = [
  { quote: 'Bir kahve daha içsek mi?', who: 'Esra' },
  { quote: 'Maçı kaçırmam, sonra konuşuruz.', who: 'Ömer' },
  { quote: 'Kediye yine ben mama verdim.', who: 'Esra' },
  { quote: 'Bu akşam yemeği ben yapayım.', who: 'Ömer' },
  { quote: 'Tatil planını çoktan hazırladım bile.', who: 'Esra' },
]

const PEOPLE = ['Esra', 'Ömer']

export default function WhoSaid() {
  const total = rounds.length
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const current = rounds[index]
  const answered = picked !== null

  const restart = () => {
    setIndex(0)
    setPicked(null)
    setCorrect(0)
    setDone(false)
  }

  const choose = (name) => {
    if (answered) return
    setPicked(name)
    if (name === current.who) setCorrect((c) => c + 1)
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
          <p className="font-display italic text-primary text-2xl">
            Bitti — {correct}/{total} doğru
          </p>
          <button type="button" onClick={restart} className="btn-lux mt-6">
            Tekrar Oyna
          </button>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell label="Esra mı Ömer mi" title="Kim Demiş?">
      <p className="label text-center">
        {index + 1}/{total}
      </p>

      <blockquote className="card-soft px-6 py-8 mt-4 text-center font-display italic text-primary text-2xl leading-snug">
        “{current.quote}”
      </blockquote>

      <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-xs">
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
              className="card-soft px-4 py-3 font-display text-lg text-ink transition-colors"
            >
              {name}
            </button>
          )
        })}
      </div>

      {answered && (
        <button type="button" onClick={next} className="btn-lux mt-6">
          {index + 1 >= total ? 'Bitir' : 'Sıradaki'}
        </button>
      )}
    </GameShell>
  )
}
