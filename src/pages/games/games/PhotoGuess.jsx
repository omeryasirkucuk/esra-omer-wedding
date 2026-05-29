// "Foto Tahmin": a small multiple-choice game over a few rounds. Each round shows
// a placeholder tile (where a real couple photo will go) and asks a "which
// year / where" style question. Gentle correct/total tally at the end.
import { useState } from 'react'
import GameShell from '../GameShell.jsx'

// TODO: replace the gradient placeholders with real photo URLs and edit the
// questions/options/answer below when the couple's photos are available.
const rounds = [
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

export default function PhotoGuess() {
  const total = rounds.length
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const current = rounds[index]
  const answered = selected !== null

  const restart = () => {
    setIndex(0)
    setSelected(null)
    setCorrect(0)
    setDone(false)
  }

  const choose = (i) => {
    if (answered) return
    setSelected(i)
    if (i === current.answerIndex) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (index + 1 >= total) return setDone(true)
    setIndex((n) => n + 1)
    setSelected(null)
  }

  if (done) {
    return (
      <GameShell label="Bil bakalım" title="Foto Tahmin">
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
    <GameShell label="Bil bakalım" title="Foto Tahmin">
      <p className="label text-center">
        {index + 1}/{total}
      </p>
      <div
        className="w-full max-w-xs aspect-[4/3] rounded-2xl border border-[#e2d6b8] mt-3 flex items-center justify-center text-gold text-3xl"
        style={{ background: current.gradient }}
        aria-hidden="true"
      >
        ❀
      </div>
      <h2 className="font-display text-primary text-xl text-center mt-5">
        {current.prompt}
      </h2>

      <div className="grid grid-cols-2 gap-3 mt-5 w-full max-w-xs">
        {current.options.map((opt, i) => {
          const isCorrect = i === current.answerIndex
          const isPicked = i === selected
          let style
          if (answered && isCorrect) {
            style = { background: 'var(--c-primary-soft)', color: '#fff', borderColor: 'var(--c-primary)' }
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
              className="card-soft px-3 py-3 font-display text-lg text-ink transition-colors"
            >
              {opt}
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
