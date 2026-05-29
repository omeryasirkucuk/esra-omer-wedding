// "Çifti Tanı" quiz: walks through the questions in src/data/quiz.js, one at a
// time, with a thin gold progress bar. Tapping an option reveals correct/wrong
// tinting; a "Sıradaki" button advances. Ends with a gentle correct/total tally.
// The couple can edit the questions and answers directly in src/data/quiz.js.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import GameShell from '../GameShell.jsx'
import GameOverActions from '../GameOverActions.jsx'
import { quizQuestions } from '../../../data/quiz.js'
import { api } from '../../../lib/api.js'
import { useScoreSubmit } from '../useScoreSubmit.js'
import EndScoreboard from '../EndScoreboard.jsx'

export default function Quiz() {
  // Prefer admin-edited questions; fall back to the bundled defaults.
  const [questions, setQuestions] = useState(quizQuestions)
  useEffect(() => {
    api
      .getGamesContent()
      .then((c) => {
        if (c && Array.isArray(c.quiz) && c.quiz.length) setQuestions(c.quiz)
      })
      .catch(() => {})
  }, [])

  const quizQuestionsActive = questions
  const total = quizQuestionsActive.length
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  // Per-question record for the scoreboard detail payload.
  const [answers, setAnswers] = useState([])

  const current = quizQuestionsActive[index]
  const answered = selected !== null

  // Result label shared by the score submission and the end scoreboard.
  const resultLabel = `${correct}/${total} doğru`

  // Submit the final result exactly once when the quiz ends.
  useScoreSubmit(done, () => ({
    game: 'cifti-tani',
    score: correct,
    label: resultLabel,
    detail: answers,
  }))

  const restart = () => {
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
        soru: current.question,
        cevap: current.options[i],
        dogru: current.options[current.answerIndex],
        ok,
      },
    ])
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
      <GameShell label={<span lang="en">Quiz</span>} title="Çifti Tanı">
        <div className="text-center mt-4 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl md:text-3xl">
            Bitti
          </p>
          <EndScoreboard game="cifti-tani" myLabel={resultLabel} />
          <GameOverActions onRestart={restart} />
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell label={<span lang="en">Quiz</span>} title="Çifti Tanı">
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
          className="font-display text-primary text-xl md:text-2xl text-center mt-7 md:mt-9 leading-snug"
        >
          {current.question}
        </motion.h2>

        <div className="flex flex-col gap-3 md:gap-4 mt-6 md:mt-8">
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
                className={`card-soft text-center px-4 py-3 md:px-6 md:py-4 font-display text-lg md:text-xl transition-colors ${tone} ${
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
            <button type="button" onClick={next} className="btn-lux md:text-[0.74rem]">
              {index + 1 >= total ? 'Bitir' : 'Sıradaki'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
