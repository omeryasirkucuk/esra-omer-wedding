// Unified games-content editor. Loads the single saved games document; when a
// section is empty it seeds from the bundled defaults so the couple always has
// something to edit. Three sections — "Çifti Tanı (Quiz)", "Kim Demiş?" and
// "Foto Tahmin" (with image upload) — are saved together as one object.
import { useEffect, useState } from 'react'
import { getGamesContent, saveGamesContent, setGameEnabled, uploadPhoto, mediaUrl } from '../adminApi'
import { useCoupleNames } from '../useCoupleNames'
import { quizQuestions } from '../../data/quiz'
import { alertDialog } from '../../lib/confirm.js'

// --- Seeds (kept in sync with the bundled defaults in the game pages) ------

// Quiz seed, cloned so edits never mutate the imported module data.
function seedQuiz() {
  return quizQuestions.map((q) => ({
    question: q.question,
    options: [...q.options],
    answerIndex: q.answerIndex,
  }))
}

// "Kim Demiş?" seed — mirrors the default quotes in WhoSaid.jsx, mapped to the
// stored shape { quote, answer: 'esra' | 'omer' }.
function seedWhoSaid() {
  return [
    { quote: 'Bir kahve daha içsek mi?', answer: 'esra' },
    { quote: 'Maçı kaçırmam, sonra konuşuruz.', answer: 'omer' },
    { quote: 'Kediye yine ben mama verdim.', answer: 'esra' },
    { quote: 'Bu akşam yemeği ben yapayım.', answer: 'omer' },
    { quote: 'Tatil planını çoktan hazırladım bile.', answer: 'esra' },
  ]
}

// "Foto Tahmin" seed — mirrors the default rounds in PhotoGuess.jsx. The bundled
// defaults use gradient placeholders (no real images), so imageUrl starts empty.
function seedPhotoGuess() {
  return [
    {
      imageUrl: '',
      question: 'Bu fotoğraf hangi yıl çekildi?',
      options: ['2019', '2021', '2022', '2023'],
      answerIndex: 1,
    },
    {
      imageUrl: '',
      question: 'Bu kare nerede çekildi?',
      options: ['İstanbul', 'İzmir', 'Bodrum', 'Kapadokya'],
      answerIndex: 3,
    },
    {
      imageUrl: '',
      question: 'Bu fotoğraf hangi mevsimde çekildi?',
      options: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'],
      answerIndex: 0,
    },
    {
      imageUrl: '',
      question: 'Bu anı hangi etkinlikten?',
      options: ['Doğum günü', 'Tatil', 'Söz', 'Konser'],
      answerIndex: 2,
    },
  ]
}

function blankQuestion() {
  return { question: '', options: ['', '', '', ''], answerIndex: 0 }
}

function blankWhoSaid() {
  return { quote: '', answer: 'esra' }
}

function blankRound() {
  return { imageUrl: '', question: '', options: ['', '', '', ''], answerIndex: 0 }
}

// Normalise an incoming question/round so it always has an editable shape.
function normalizeQuestion(q) {
  return {
    question: q?.question || '',
    options: Array.isArray(q?.options) ? [...q.options] : ['', '', '', ''],
    answerIndex: typeof q?.answerIndex === 'number' ? q.answerIndex : 0,
  }
}

function normalizeRound(r) {
  return {
    imageUrl: r?.imageUrl || '',
    question: r?.question || '',
    options: Array.isArray(r?.options) ? [...r.options] : ['', '', '', ''],
    answerIndex: typeof r?.answerIndex === 'number' ? r.answerIndex : 0,
  }
}

function normalizeWhoSaid(w) {
  return {
    quote: w?.quote || '',
    answer: w?.answer === 'omer' ? 'omer' : 'esra',
  }
}

// Memory ("Hafıza") uses a fixed 4x4 board = 8 distinct photos, one per pair.
const MEMORY_SLOTS = 8

const GAME_TABS = [
  { id: 'quiz', label: 'Çifti Tanı' },
  { id: 'whoSaid', label: 'Kim Demiş?' },
  { id: 'photo', label: 'Foto Tahmin' },
  { id: 'memory', label: 'Hafıza' },
  { id: 'puzzle', label: 'Yapboz' },
]

// The guest-facing route ids (what the enabled map and the score board key on),
// in the same order as the editor tabs above.
const GAME_SWITCHES = [
  { id: 'cifti-tani', label: 'Çifti Tanı' },
  { id: 'kim-demis', label: 'Kim Demiş?' },
  { id: 'foto-tahmin', label: 'Foto Tahmin' },
  { id: 'eslestirme', label: 'Hafıza' },
  { id: 'yapboz', label: 'Yapboz' },
]

// Normalise the memory array into exactly MEMORY_SLOTS string slots so the editor
// always renders a fixed grid; empty slots are ''.
function normalizeMemory(arr) {
  const src = Array.isArray(arr) ? arr : []
  return Array.from({ length: MEMORY_SLOTS }, (_, i) =>
    typeof src[i] === 'string' ? src[i] : ''
  )
}

function normalizePuzzle(p) {
  return { imageUrl: p?.imageUrl || '' }
}

export default function GamesEditor({ onAuthError }) {
  const couple = useCoupleNames()
  const [quiz, setQuiz] = useState(null)
  const [whoSaid, setWhoSaid] = useState(null)
  const [photoGuess, setPhotoGuess] = useState(null)
  const [memory, setMemory] = useState(null)
  const [puzzle, setPuzzle] = useState(null)
  const [enabled, setEnabled] = useState(null) // { <gameId>: false } — missing key = on
  const [selected, setSelected] = useState('quiz')
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    getGamesContent()
      .then((d) => {
        if (!alive) return
        const q = Array.isArray(d?.quiz) && d.quiz.length > 0 ? d.quiz : seedQuiz()
        const w = Array.isArray(d?.whoSaid) && d.whoSaid.length > 0 ? d.whoSaid : seedWhoSaid()
        const p =
          Array.isArray(d?.photoGuess) && d.photoGuess.length > 0
            ? d.photoGuess
            : seedPhotoGuess()
        setQuiz(q.map(normalizeQuestion))
        setWhoSaid(w.map(normalizeWhoSaid))
        setPhotoGuess(p.map(normalizeRound))
        setMemory(normalizeMemory(d?.memory))
        setPuzzle(normalizePuzzle(d?.puzzle))
        setEnabled(d?.enabled || {})
      })
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  const touch = () => setSaved(false)

  // --- Quiz mutations -------------------------------------------------------

  function updateQuiz(qi, updater) {
    touch()
    setQuiz((prev) => prev.map((q, i) => (i === qi ? updater(q) : q)))
  }
  const setQuizText = (qi, t) => updateQuiz(qi, (q) => ({ ...q, question: t }))
  const setQuizOption = (qi, oi, t) =>
    updateQuiz(qi, (q) => ({ ...q, options: q.options.map((o, i) => (i === oi ? t : o)) }))
  const setQuizAnswer = (qi, oi) => updateQuiz(qi, (q) => ({ ...q, answerIndex: oi }))
  const addQuizOption = (qi) => updateQuiz(qi, (q) => ({ ...q, options: [...q.options, ''] }))
  const removeQuizOption = (qi, oi) =>
    updateQuiz(qi, (q) => removeOption(q, oi))
  function addQuizQuestion() {
    touch()
    setQuiz((prev) => [...prev, blankQuestion()])
  }
  function removeQuizQuestion(qi) {
    touch()
    setQuiz((prev) => prev.filter((_, i) => i !== qi))
  }
  function moveQuiz(qi, dir) {
    touch()
    setQuiz((prev) => move(prev, qi, dir))
  }

  // --- Who-said mutations ---------------------------------------------------

  function updateWho(wi, updater) {
    touch()
    setWhoSaid((prev) => prev.map((w, i) => (i === wi ? updater(w) : w)))
  }
  const setWhoQuote = (wi, t) => updateWho(wi, (w) => ({ ...w, quote: t }))
  const setWhoAnswer = (wi, a) => updateWho(wi, (w) => ({ ...w, answer: a }))
  function addWho() {
    touch()
    setWhoSaid((prev) => [...prev, blankWhoSaid()])
  }
  function removeWho(wi) {
    touch()
    setWhoSaid((prev) => prev.filter((_, i) => i !== wi))
  }
  function moveWho(wi, dir) {
    touch()
    setWhoSaid((prev) => move(prev, wi, dir))
  }

  // --- Photo-guess mutations ------------------------------------------------

  function updateRound(ri, updater) {
    touch()
    setPhotoGuess((prev) => prev.map((r, i) => (i === ri ? updater(r) : r)))
  }
  const setRoundImage = (ri, url) => updateRound(ri, (r) => ({ ...r, imageUrl: url }))
  const setRoundQuestion = (ri, t) => updateRound(ri, (r) => ({ ...r, question: t }))
  const setRoundOption = (ri, oi, t) =>
    updateRound(ri, (r) => ({ ...r, options: r.options.map((o, i) => (i === oi ? t : o)) }))
  const setRoundAnswer = (ri, oi) => updateRound(ri, (r) => ({ ...r, answerIndex: oi }))
  const addRoundOption = (ri) => updateRound(ri, (r) => ({ ...r, options: [...r.options, ''] }))
  const removeRoundOption = (ri, oi) => updateRound(ri, (r) => removeOption(r, oi))
  function addRound() {
    touch()
    setPhotoGuess((prev) => [...prev, blankRound()])
  }
  function removeRound(ri) {
    touch()
    setPhotoGuess((prev) => prev.filter((_, i) => i !== ri))
  }
  function moveRound(ri, dir) {
    touch()
    setPhotoGuess((prev) => move(prev, ri, dir))
  }

  // --- Memory mutations -----------------------------------------------------

  function setMemorySlot(index, url) {
    touch()
    setMemory((prev) => prev.map((u, i) => (i === index ? url : u)))
  }

  // --- Puzzle mutations -----------------------------------------------------

  function setPuzzleImage(url) {
    touch()
    setPuzzle({ imageUrl: url })
  }

  // --- Enable/disable -------------------------------------------------------

  // Each flip persists immediately through the merging endpoint (no "Kaydet"
  // needed); on failure the switch snaps back.
  async function toggleGame(id) {
    const next = enabled[id] === false
    const prev = enabled
    setEnabled({ ...prev, [id]: next })
    try {
      await setGameEnabled(id, next)
    } catch (e) {
      setEnabled(prev)
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('Değiştirilemedi, tekrar deneyin.')
    }
  }

  // --- Save -----------------------------------------------------------------

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      // `enabled` rides along so the whole-doc replace never drops the flags.
      await saveGamesContent({ quiz, whoSaid, photoGuess, memory, puzzle, enabled })
      setSaved(true)
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('Kaydedilemedi, tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!quiz || !whoSaid || !photoGuess || !memory || !puzzle || !enabled)
    return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 sticky top-0 z-10 bg-bg/80 backdrop-blur py-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {GAME_TABS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g.id)}
              className={`font-sans uppercase text-xs tracking-[0.15em] px-4 py-2 rounded-full border transition ${
                selected === g.id
                  ? 'border-gold text-primary bg-surface'
                  : 'border-line text-muted hover:text-primary'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="label-gold">Kaydedildi</span>}
          <button type="button" className="btn-lux" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Per-game on/off switches. Off = the game disappears from the guest
          hub and its direct link bounces back; flips persist instantly. */}
      <div className="card-soft px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        {GAME_SWITCHES.map((g) => {
          const on = enabled[g.id] !== false
          return (
            <div key={g.id} className="flex items-center gap-3">
              <span className={`font-display text-lg ${on ? 'text-primary' : 'text-muted line-through'}`}>
                {g.label}
              </span>
              <button
                type="button"
                onClick={() => toggleGame(g.id)}
                role="switch"
                aria-checked={on}
                aria-label={`${g.label} açık/kapalı`}
                className="relative w-14 h-8 rounded-full border border-line transition-colors shrink-0"
                style={{ background: on ? 'var(--c-gold)' : '#cdc6b4' }}
              >
                <span
                  className="absolute top-1 left-1 w-6 h-6 rounded-full bg-surface shadow transition-transform"
                  style={{ transform: on ? 'translateX(22px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Section: Quiz --------------------------------------------------- */}
      {selected === 'quiz' && (
      <section>
        <SectionHeading title="Çifti Tanı (Quiz)" count={`${quiz.length} soru`} />
        <div className="space-y-4">
          {quiz.map((q, qi) => (
            <QuestionCard
              key={qi}
              index={qi}
              count={quiz.length}
              item={q}
              onText={(t) => setQuizText(qi, t)}
              onOption={(oi, t) => setQuizOption(qi, oi, t)}
              onAnswer={(oi) => setQuizAnswer(qi, oi)}
              onAddOption={() => addQuizOption(qi)}
              onRemoveOption={(oi) => removeQuizOption(qi, oi)}
              onRemove={() => removeQuizQuestion(qi)}
              onMove={(dir) => moveQuiz(qi, dir)}
            />
          ))}
        </div>
        <button type="button" onClick={addQuizQuestion} className="btn-lux mt-5 w-full sm:w-auto">
          + Soru ekle
        </button>
      </section>
      )}

      {/* Section: Who said? --------------------------------------------- */}
      {selected === 'whoSaid' && (
      <section>
        <SectionHeading title="Kim Demiş?" count={`${whoSaid.length} alıntı`} />
        <div className="space-y-4">
          {whoSaid.map((w, wi) => (
            <WhoSaidCard
              key={wi}
              index={wi}
              count={whoSaid.length}
              item={w}
              couple={couple}
              onQuote={(t) => setWhoQuote(wi, t)}
              onAnswer={(a) => setWhoAnswer(wi, a)}
              onRemove={() => removeWho(wi)}
              onMove={(dir) => moveWho(wi, dir)}
            />
          ))}
        </div>
        <button type="button" onClick={addWho} className="btn-lux mt-5 w-full sm:w-auto">
          + Alıntı ekle
        </button>
      </section>
      )}

      {/* Section: Photo guess ------------------------------------------- */}
      {selected === 'photo' && (
      <section>
        <SectionHeading title="Foto Tahmin" count={`${photoGuess.length} tur`} />
        <div className="space-y-4">
          {photoGuess.map((r, ri) => (
            <PhotoRoundCard
              key={ri}
              index={ri}
              count={photoGuess.length}
              item={r}
              onImage={(url) => setRoundImage(ri, url)}
              onText={(t) => setRoundQuestion(ri, t)}
              onOption={(oi, t) => setRoundOption(ri, oi, t)}
              onAnswer={(oi) => setRoundAnswer(ri, oi)}
              onAddOption={() => addRoundOption(ri)}
              onRemoveOption={(oi) => removeRoundOption(ri, oi)}
              onRemove={() => removeRound(ri)}
              onMove={(dir) => moveRound(ri, dir)}
              onAuthError={onAuthError}
            />
          ))}
        </div>
        <button type="button" onClick={addRound} className="btn-lux mt-5 w-full sm:w-auto">
          + Tur ekle
        </button>
      </section>
      )}

      {/* Section: Memory ------------------------------------------------- */}
      {selected === 'memory' && (
      <section>
        <SectionHeading
          title="Hafıza"
          count={`${memory.filter(Boolean).length}/${MEMORY_SLOTS} foto`}
        />
        <p className="text-muted text-sm mb-4">
          4×4 oyun için 8 farklı foto. Her foto bir çiftle eşleşir.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {memory.map((url, i) => (
            <MemorySlotCard
              key={i}
              index={i}
              url={url}
              onImage={(u) => setMemorySlot(i, u)}
              onAuthError={onAuthError}
            />
          ))}
        </div>
      </section>
      )}

      {/* Section: Puzzle ------------------------------------------------- */}
      {selected === 'puzzle' && (
      <section>
        <SectionHeading
          title="Yapboz"
          count={puzzle.imageUrl ? 'Görsel hazır' : 'Görsel yok'}
        />
        <p className="text-muted text-sm mb-4">
          Yüklediğiniz tek görsel parçalara ayrılır; doğru sıralanınca görsel
          tamamlanır. Kare biçimli bir foto önerilir.
        </p>
        <PuzzleImageCard
          url={puzzle.imageUrl}
          onImage={setPuzzleImage}
          onAuthError={onAuthError}
        />
      </section>
      )}
    </div>
  )
}

// --- Pure helpers shared across sections -----------------------------------

// Remove an option from a question/round while keeping the answerIndex valid;
// never drop below two options.
function removeOption(item, oi) {
  if (item.options.length <= 2) return item
  const options = item.options.filter((_, i) => i !== oi)
  let answerIndex = item.answerIndex
  if (oi === answerIndex) answerIndex = 0
  else if (oi < answerIndex) answerIndex -= 1
  return { ...item, options, answerIndex }
}

// Move an array item up (-1) or down (+1), clamped to the bounds.
function move(list, i, dir) {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

// --- Shared presentational pieces ------------------------------------------

function SectionHeading({ title, count }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-line pb-2 mb-4">
      <h2 className="font-display text-2xl text-gold">{title}</h2>
      <p className="label">{count}</p>
    </div>
  )
}

function MoveControls({ index, count, onMove }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Yukarı taşı"
        className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center text-xs hover:bg-surface transition disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label="Aşağı taşı"
        className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center text-xs hover:bg-surface transition disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  )
}

function RemoveButton({ onRemove, label }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
    >
      🗑
    </button>
  )
}

// Options block reused by the quiz and photo-guess cards.
function OptionsEditor({ name, options, answerIndex, onOption, onAnswer, onAddOption, onRemoveOption }) {
  return (
    <>
      <div className="space-y-2 pl-1">
        {options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={answerIndex === oi}
              onChange={() => onAnswer(oi)}
              aria-label="Doğru cevap"
              className="accent-gold w-4 h-4 shrink-0"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => onOption(oi, e.target.value)}
              placeholder={`Seçenek ${oi + 1}`}
              className="flex-1 bg-bg border border-line rounded px-3 py-1.5 text-ink outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={() => onRemoveOption(oi)}
              aria-label="Seçeneği sil"
              disabled={options.length <= 2}
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
    </>
  )
}

// --- Quiz card -------------------------------------------------------------

function QuestionCard({
  index,
  count,
  item,
  onText,
  onOption,
  onAnswer,
  onAddOption,
  onRemoveOption,
  onRemove,
  onMove,
}) {
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="font-display text-2xl text-gold leading-none mt-1">{index + 1}</span>
        <input
          type="text"
          value={item.question}
          onChange={(e) => onText(e.target.value)}
          placeholder="Soru metni"
          className="flex-1 bg-bg border border-line rounded px-3 py-2 font-display text-lg text-primary outline-none focus:border-gold"
        />
        <MoveControls index={index} count={count} onMove={onMove} />
        <RemoveButton onRemove={onRemove} label="Soruyu sil" />
      </div>
      <OptionsEditor
        name={`quiz-answer-${index}`}
        options={item.options}
        answerIndex={item.answerIndex}
        onOption={onOption}
        onAnswer={onAnswer}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
      />
    </div>
  )
}

// --- Who-said card ---------------------------------------------------------

function WhoSaidCard({ index, count, item, couple, onQuote, onAnswer, onRemove, onMove }) {
  const name = `who-answer-${index}`
  // Stored answer keys stay 'esra'/'omer' (bride/groom) for compatibility with
  // existing content and scores; only the visible labels follow the site names.
  const people = [
    { value: 'esra', label: couple.bride },
    { value: 'omer', label: couple.groom },
  ]
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="font-display text-2xl text-gold leading-none mt-1">{index + 1}</span>
        <textarea
          value={item.quote}
          onChange={(e) => onQuote(e.target.value)}
          placeholder="Alıntı metni"
          rows={2}
          className="flex-1 bg-bg border border-line rounded px-3 py-2 font-display italic text-lg text-primary outline-none focus:border-gold resize-y"
        />
        <MoveControls index={index} count={count} onMove={onMove} />
        <RemoveButton onRemove={onRemove} label="Alıntıyı sil" />
      </div>
      <div className="flex items-center gap-5 pl-1">
        <span className="label">Söyleyen:</span>
        {people.map((p) => (
          <label key={p.value} className="flex items-center gap-2 cursor-pointer text-ink">
            <input
              type="radio"
              name={name}
              checked={item.answer === p.value}
              onChange={() => onAnswer(p.value)}
              className="accent-gold w-4 h-4"
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  )
}

// --- Photo-guess round card ------------------------------------------------

function PhotoRoundCard({
  index,
  count,
  item,
  onImage,
  onText,
  onOption,
  onAnswer,
  onAddOption,
  onRemoveOption,
  onRemove,
  onMove,
  onAuthError,
}) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadPhoto(file)
      onImage(res.url)
    } catch (err) {
      if (err.name === 'AuthError') onAuthError()
      else await alertDialog('Görsel yüklenemedi, tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="font-display text-2xl text-gold leading-none mt-1">{index + 1}</span>
        <input
          type="text"
          value={item.question}
          onChange={(e) => onText(e.target.value)}
          placeholder="Soru metni"
          className="flex-1 bg-bg border border-line rounded px-3 py-2 font-display text-lg text-primary outline-none focus:border-gold"
        />
        <MoveControls index={index} count={count} onMove={onMove} />
        <RemoveButton onRemove={onRemove} label="Turu sil" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-3">
        <div className="shrink-0">
          {item.imageUrl ? (
            <img
              src={mediaUrl(item.imageUrl)}
              alt="Tur görseli"
              className="w-40 h-32 object-cover rounded-xl border border-[#e2d6b8]"
            />
          ) : (
            <div className="w-40 h-32 rounded-xl border border-dashed border-line flex items-center justify-center text-muted text-sm text-center px-2">
              Görsel yok
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 justify-center">
          <label className="btn-lux cursor-pointer text-center w-full sm:w-auto">
            {uploading ? 'Yükleniyor…' : item.imageUrl ? 'Görseli Değiştir' : 'Görsel Yükle'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {item.imageUrl && (
            <button
              type="button"
              onClick={() => onImage('')}
              className="text-sm text-primary-soft hover:text-primary transition"
            >
              Görseli kaldır
            </button>
          )}
        </div>
      </div>

      <OptionsEditor
        name={`photo-answer-${index}`}
        options={item.options}
        answerIndex={item.answerIndex}
        onOption={onOption}
        onAnswer={onAnswer}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
      />
    </div>
  )
}

// --- Memory slot card ------------------------------------------------------

// One of the eight fixed photo slots for the memory ("Hafıza") game. Keeps its
// position in the array; an empty slot stores ''.
function MemorySlotCard({ index, url, onImage, onAuthError }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadPhoto(file)
      onImage(res.url)
    } catch (err) {
      if (err.name === 'AuthError') onAuthError()
      else await alertDialog('Görsel yüklenemedi, tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card-soft p-3 flex flex-col gap-2">
      <span className="label">Foto {index + 1}</span>
      {url ? (
        <img
          src={mediaUrl(url)}
          alt={`Foto ${index + 1}`}
          className="w-full aspect-square object-cover rounded-xl border border-[#e2d6b8]"
        />
      ) : (
        <div className="w-full aspect-square rounded-xl border border-dashed border-line flex items-center justify-center text-muted text-sm text-center px-2">
          Boş
        </div>
      )}
      <label className="btn-lux cursor-pointer text-center w-full">
        {uploading ? 'Yükleniyor…' : url ? 'Değiştir' : 'Görsel Yükle'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => onImage('')}
          className="text-sm text-primary-soft hover:text-primary transition"
        >
          Kaldır
        </button>
      )}
    </div>
  )
}

// --- Puzzle image card -----------------------------------------------------

// The single source image for the slide puzzle ("Yapboz"). The guest game slices
// it client-side via CSS background positioning.
function PuzzleImageCard({ url, onImage, onAuthError }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadPhoto(file)
      onImage(res.url)
    } catch (err) {
      if (err.name === 'AuthError') onAuthError()
      else await alertDialog('Görsel yüklenemedi, tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card-soft p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
      <div className="shrink-0">
        {url ? (
          <img
            src={mediaUrl(url)}
            alt="Yapboz görseli"
            className="w-48 h-48 object-cover rounded-xl border border-[#e2d6b8]"
          />
        ) : (
          <div className="w-48 h-48 rounded-xl border border-dashed border-line flex items-center justify-center text-muted text-sm text-center px-2">
            Görsel yok
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 justify-center">
        <label className="btn-lux cursor-pointer text-center w-full sm:w-auto">
          {uploading ? 'Yükleniyor…' : url ? 'Görseli Değiştir' : 'Görsel Yükle'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={() => onImage('')}
            className="text-sm text-primary-soft hover:text-primary transition"
          >
            Görseli kaldır
          </button>
        )}
      </div>
    </div>
  )
}
