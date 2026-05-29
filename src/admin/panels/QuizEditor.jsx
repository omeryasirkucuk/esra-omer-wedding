// Quiz editor for the "Çifti Tanı" game. Loads saved content from the server;
// if none exists yet, seeds from the bundled quizQuestions. The couple can edit
// question text, edit/add/remove options, choose the correct option, and
// add/remove questions, then save back to the server.
import { useEffect, useState } from 'react'
import { getGamesContent, saveGamesContent } from '../adminApi'
import { quizQuestions } from '../../data/quiz'

// Clone the seed so edits never mutate the imported module data.
function seedQuiz() {
  return quizQuestions.map((q) => ({
    question: q.question,
    options: [...q.options],
    answerIndex: q.answerIndex,
  }))
}

function blankQuestion() {
  return { question: '', options: ['', '', '', ''], answerIndex: 0 }
}

export default function QuizEditor({ onAuthError }) {
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    getGamesContent()
      .then((d) => {
        if (!alive) return
        const incoming = Array.isArray(d?.quiz) && d.quiz.length > 0 ? d.quiz : seedQuiz()
        // Normalise so every question always has an editable shape.
        setQuiz(
          incoming.map((q) => ({
            question: q.question || '',
            options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
            answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : 0,
          })),
        )
      })
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Generic per-question updater that also clears the "saved" flag.
  function updateQuestion(qi, updater) {
    setSaved(false)
    setQuiz((prev) => prev.map((q, i) => (i === qi ? updater(q) : q)))
  }

  const setQuestionText = (qi, text) =>
    updateQuestion(qi, (q) => ({ ...q, question: text }))

  const setOptionText = (qi, oi, text) =>
    updateQuestion(qi, (q) => ({
      ...q,
      options: q.options.map((o, i) => (i === oi ? text : o)),
    }))

  const setAnswer = (qi, oi) => updateQuestion(qi, (q) => ({ ...q, answerIndex: oi }))

  const addOption = (qi) =>
    updateQuestion(qi, (q) => ({ ...q, options: [...q.options, ''] }))

  const removeOption = (qi, oi) =>
    updateQuestion(qi, (q) => {
      if (q.options.length <= 2) return q // keep at least two options
      const options = q.options.filter((_, i) => i !== oi)
      let answerIndex = q.answerIndex
      if (oi === answerIndex) answerIndex = 0
      else if (oi < answerIndex) answerIndex -= 1
      return { ...q, options, answerIndex }
    })

  function addQuestion() {
    setSaved(false)
    setQuiz((prev) => [...prev, blankQuestion()])
  }

  function removeQuestion(qi) {
    setSaved(false)
    setQuiz((prev) => prev.filter((_, i) => i !== qi))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await saveGamesContent({ quiz })
      setSaved(true)
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else alert('Kaydedilemedi, tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!quiz) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="label">{quiz.length} soru · Çifti Tanı</p>
        <div className="flex items-center gap-3">
          {saved && <span className="label-gold">Kaydedildi</span>}
          <button type="button" className="btn-lux" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.map((q, qi) => (
          <QuestionCard
            key={qi}
            index={qi}
            question={q}
            onQuestionText={(t) => setQuestionText(qi, t)}
            onOptionText={(oi, t) => setOptionText(qi, oi, t)}
            onAnswer={(oi) => setAnswer(qi, oi)}
            onAddOption={() => addOption(qi)}
            onRemoveOption={(oi) => removeOption(qi, oi)}
            onRemove={() => removeQuestion(qi)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="btn-lux mt-5 w-full sm:w-auto"
      >
        + Soru ekle
      </button>
    </div>
  )
}

function QuestionCard({
  index,
  question,
  onQuestionText,
  onOptionText,
  onAnswer,
  onAddOption,
  onRemoveOption,
  onRemove,
}) {
  const name = `answer-${index}`
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="font-display text-2xl text-gold leading-none mt-1">{index + 1}</span>
        <input
          type="text"
          value={question.question}
          onChange={(e) => onQuestionText(e.target.value)}
          placeholder="Soru metni"
          className="flex-1 bg-bg border border-line rounded px-3 py-2 font-display text-lg text-primary outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Soruyu sil"
          className="w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
        >
          🗑
        </button>
      </div>

      <div className="space-y-2 pl-1">
        {question.options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={question.answerIndex === oi}
              onChange={() => onAnswer(oi)}
              aria-label="Doğru cevap"
              className="accent-gold w-4 h-4 shrink-0"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => onOptionText(oi, e.target.value)}
              placeholder={`Seçenek ${oi + 1}`}
              className="flex-1 bg-bg border border-line rounded px-3 py-1.5 text-ink outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={() => onRemoveOption(oi)}
              aria-label="Seçeneği sil"
              disabled={question.options.length <= 2}
              className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center text-xs hover:bg-surface transition shrink-0 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddOption}
        className="mt-3 text-sm text-primary-soft hover:text-primary transition"
      >
        + Seçenek ekle
      </button>
    </div>
  )
}
