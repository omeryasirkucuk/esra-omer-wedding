// Scores panel: the game scoreboard. Lists every play (who played which game,
// their result, and what they answered), newest first, with a per-game filter,
// an expandable per-question breakdown, and a delete action.
import { useEffect, useMemo, useState } from 'react'
import { getScores, deleteScore } from '../adminApi'
import { formatDateTime } from '../format'

// Map the stored game key to its Turkish display name.
const GAME_NAMES = {
  eslestirme: 'Hafıza',
  'cifti-tani': 'Çifti Tanı',
  'foto-tahmin': 'Foto Tahmin',
  yapboz: 'Yapboz',
  'kim-demis': 'Kim Demiş?',
  'fark-bul': 'Farkı Bul',
}

// Stable order for the filter pills, plus a leading "Hepsi" (all) option.
const GAME_KEYS = Object.keys(GAME_NAMES)

function gameName(key) {
  return GAME_NAMES[key] || key || '—'
}

export default function Scores({ onAuthError }) {
  const [scores, setScores] = useState(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let alive = true
    getScores()
      .then((d) => alive && setScores(d.scores || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Apply the active game filter. The API already returns newest-first.
  const visible = useMemo(() => {
    if (!scores) return []
    return filter === 'all' ? scores : scores.filter((s) => s.game === filter)
  }, [scores, filter])

  async function handleDelete(entry) {
    const name = entry.displayName || 'bu sonuç'
    if (!window.confirm(`${name} sonucu silinsin mi?`)) return
    try {
      await deleteScore(entry.id)
      setScores((prev) => (prev || []).filter((s) => s.id !== entry.id))
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else alert('Silinemedi, tekrar deneyin.')
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!scores) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  // Only offer filter pills for games that actually have results, plus "Hepsi".
  const playedKeys = GAME_KEYS.filter((k) => scores.some((s) => s.game === k))

  return (
    <div>
      {/* Per-game filter pills. */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
          Hepsi
        </Pill>
        {playedKeys.map((key) => (
          <Pill key={key} active={filter === key} onClick={() => setFilter(key)}>
            {gameName(key)}
          </Pill>
        ))}
      </div>

      <p className="label mb-3">{visible.length} sonuç</p>

      {visible.length === 0 ? (
        <p className="text-muted text-center py-10">Henüz oynanmadı</p>
      ) : (
        <div className="scroll-gold overflow-auto max-h-[72vh] space-y-3 pr-1">
          {visible.map((s) => (
            <ScoreCard key={s.id} score={s} onDelete={() => handleDelete(s)} />
          ))}
        </div>
      )}
    </div>
  )
}

// A single scoreboard row: player, game, result, time, and an optional
// expandable answer breakdown.
function ScoreCard({ score, onDelete }) {
  const [open, setOpen] = useState(false)
  const hasDetail = detailHasContent(score.detail)

  return (
    <article className="card-soft p-4">
      <div className="flex gap-3 items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-lg text-primary">
              {score.displayName || 'Misafir'}
            </span>
            <span className="label-gold text-[0.6rem] border border-gold/50 rounded px-1.5 py-0.5">
              {gameName(score.game)}
            </span>
            <span className="text-muted text-xs">{formatDateTime(score.createdAt)}</span>
          </div>

          {score.label && <p className="text-ink mt-1 break-words">{score.label}</p>}

          {hasDetail && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 text-sm text-gold hover:underline"
            >
              {open ? 'Yanıtları gizle' : 'Yanıtları gör'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Sil"
          title="Sil"
          className="self-start w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
        >
          🗑
        </button>
      </div>

      {open && hasDetail && <Detail detail={score.detail} />}
    </article>
  )
}

// Whether a detail payload is worth rendering at all.
function detailHasContent(detail) {
  if (!detail) return false
  if (Array.isArray(detail)) return detail.length > 0
  if (typeof detail === 'object') return Object.keys(detail).length > 0
  return false
}

// Render the per-game detail: a per-question answer list for quiz-style games,
// or a chip grid of key/value pairs for move/time-style games.
function Detail({ detail }) {
  if (Array.isArray(detail)) {
    return (
      <ul className="mt-3 pt-3 border-t border-line/60 space-y-2">
        {detail.map((item, i) => (
          <AnswerItem key={i} item={item} index={i} />
        ))}
      </ul>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-line/60 flex flex-wrap gap-2">
      {Object.entries(detail).map(([key, value]) => (
        <span
          key={key}
          className="bg-bg border border-line rounded-full px-3 py-1 text-sm text-ink"
        >
          <span className="label-gold text-[0.6rem] mr-1">{key}</span>
          {String(value)}
        </span>
      ))}
    </div>
  )
}

// One question/answer row inside the expandable breakdown.
function AnswerItem({ item, index }) {
  const ok = Boolean(item.ok)
  return (
    <li className="text-sm">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 font-medium shrink-0 ${ok ? 'text-sage' : 'text-rose'}`}
          aria-hidden="true"
        >
          {ok ? '✓' : '✗'}
        </span>
        <div className="min-w-0">
          {(item.soru || item.soru === 0) && (
            <p className="text-muted">
              <span className="label mr-1">{index + 1}.</span>
              {String(item.soru)}
            </p>
          )}
          <p className="text-ink break-words">
            <span className="label mr-1">Yanıt:</span>
            {item.cevap != null && item.cevap !== '' ? String(item.cevap) : '—'}
          </p>
          {!ok && item.dogru != null && item.dogru !== '' && (
            <p className="text-sage break-words">
              <span className="label mr-1">Doğru:</span>
              {String(item.dogru)}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

// A filter pill button — gold-filled when active, outlined otherwise.
function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm border transition ${
        active
          ? 'bg-gold text-surface border-gold'
          : 'bg-bg text-muted border-line hover:border-gold'
      }`}
    >
      {children}
    </button>
  )
}
