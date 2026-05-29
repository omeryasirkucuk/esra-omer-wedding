// "Çifti Tanı" quiz: walks through the questions in src/data/quiz.js, one at a
// time, with a thin gold progress bar. Tapping an option reveals correct/wrong
// tinting; a "Sıradaki" button advances. Ends with a gentle correct/total tally.
// The couple can edit the questions and answers directly in src/data/quiz.js.
import { useState } from 'react'
import { motion } from 'framer-motion'
import GameShell from '../GameShell.jsx'
import { quizQuestions } from '../../../data/quiz.js'

export default function Quiz() {
  const total = quizQuestions.length
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const current = quizQuestions[index]
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
    if (index + 1 >= total) {
      setDone(true)
      return
    }
    setIndex((n) => n + 1)
    setSelected(null)
  }

  if (done) {
    return (
      <GameShell label="Quiz" title="Çifti Tanı">
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
    <GameShell label="Quiz" title="Çifti Tanı">
      <div className="w-full">
        <p className="label text-center">
          Soru {index + 1}/{total}
        </p>
        <div className="h-px w-full bg-line mt-2 rounded-full overflow-hidden">
          <div
            className="h-px bg-gold transition-all duration-300"
            style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }}
          />
        </div>

        <motion.h2
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="font-display text-primary text-xl text-center mt-7 leading-snug"
        >
          {current.question}
        </motion.h2>

        <div className="flex flex-col gap-3 mt-6">
          {current.options.map((opt, i) => {
            const isCorrect = i === current.answerIndex
            const isPicked = i === selected
            let tone = 'text-ink'
            let style
            if (answered && isCorrect) {
              tone = 'text-primary'
              style = { background: 'var(--c-primary-soft)', color: '#fff', borderColor: 'var(--c-primary)' }
            } else if (answered && isPicked && !isCorrect) {
              tone = 'text-rose'
              style = { background: 'var(--c-rose)', color: '#fff', borderColor: 'var(--c-rose)' }
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                style={style}
                className={`card-soft text-center px-4 py-3 font-display text-lg transition-colors ${tone} ${
                  answered ? '' : 'active:translate-y-px'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="text-center mt-7 animate-fadeUp">
            <button type="button" onClick={next} className="btn-lux">
              {index + 1 >= total ? 'Bitir' : 'Sıradaki'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
