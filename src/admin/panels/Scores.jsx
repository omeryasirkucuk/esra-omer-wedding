// Scores panel: the couple's scoreboard. Mirrors the guest end-of-game
// scoreboard's grouped/ranked look — one section per game, each a ranked list
// of best-per-player results (score desc) — but shows ALL players (no top-10
// cap). Each row expands to that player's per-question answer breakdown and can
// be deleted. A per-game filter and a total count sit above the sections.
import { useEffect, useMemo, useState } from 'react'
import { getScores, deleteScore } from '../adminApi'
import { formatDateTime } from '../format'
import { confirmDialog, alertDialog } from '../../lib/confirm.js'

// Map the stored game key to its Turkish display name.
const GAME_NAMES = {
  eslestirme: 'Hafıza',
  'cifti-tani': 'Çifti Tanı',
  'foto-tahmin': 'Foto Tahmin',
  yapboz: 'Yapboz',
  'kim-demis': 'Kim Demiş?',
  'fark-bul': 'Farkı Bul',
}

// Stable order for the filter pills and the rendered game sections.
const GAME_KEYS = Object.keys(GAME_NAMES)

function gameName(key) {
  return GAME_NAMES[key] || key || '—'
}

// Keep only each player's best attempt (highest score; newest on a tie), so a
// player who replays appears once with their best result. Mirrors the guest
// scoreboard so the couple sees the same ranking the guests do.
function bestPerPlayer(list) {
  const map = new Map()
  for (const s of list) {
    const key = s.uploaderId || `name:${s.displayName || ''}`
    const prev = map.get(key)
    const better =
      !prev ||
      (s.score ?? 0) > (prev.score ?? 0) ||
      ((s.score ?? 0) === (prev.score ?? 0) &&
        Date.parse(s.createdAt || 0) > Date.parse(prev.createdAt || 0))
    if (better) map.set(key, s)
  }
  return [...map.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
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

  async function handleDelete(entry) {
    const name = entry.displayName || 'bu sonuç'
    if (!(await confirmDialog(`${name} sonucu silinsin mi?`))) return
    try {
      await deleteScore(entry.id)
      setScores((prev) => (prev || []).filter((s) => s.id !== entry.id))
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('Silinemedi, tekrar deneyin.')
    }
  }

  // Group the (filtered) scores by game, keeping the stable GAME_KEYS order and
  // computing each game's full best-per-player ranking (no cap).
  const sections = useMemo(() => {
    if (!scores) return []
    const keys = filter === 'all' ? GAME_KEYS : [filter]
    return keys
      .map((key) => ({
        key,
        rows: bestPerPlayer(scores.filter((s) => s.game === key)),
      }))
      .filter((sec) => sec.rows.length > 0)
  }, [scores, filter])

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!scores) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  // Only offer filter pills for games that actually have results, plus "Hepsi".
  const playedKeys = GAME_KEYS.filter((k) => scores.some((s) => s.game === k))
  const total = sections.reduce((n, sec) => n + sec.rows.length, 0)

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

      <p className="label mb-3 lining-nums tabular-nums">{total} sonuç</p>

      {sections.length === 0 ? (
        <p className="text-muted text-center py-10">Henüz oynanmadı</p>
      ) : (
        <div className="scroll-gold overflow-auto max-h-[72vh] space-y-6 pr-1">
          {sections.map((sec) => (
            <GameSection
              key={sec.key}
              gameKey={sec.key}
              rows={sec.rows}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// One game's section: a heading plus a ranked list of best-per-player rows.
function GameSection({ gameKey, rows, onDelete }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="font-display text-lg text-primary">{gameName(gameKey)}</h3>
        <span className="label lining-nums tabular-nums">{rows.length}</span>
      </div>
      <ol className="card-soft px-3 py-2 md:px-4 md:py-3 flex flex-col gap-1">
        {rows.map((row, i) => (
          <ScoreRow key={row.id} score={row} rank={i + 1} onDelete={() => onDelete(row)} />
        ))}
      </ol>
    </section>
  )
}

// A single ranked row: "{rank}. {displayName} — {label}", with a "Yanıtları
// gör" toggle that reveals the player's answer breakdown, and a delete action.
function ScoreRow({ score, rank, onDelete }) {
  const [open, setOpen] = useState(false)
  const hasDetail = detailHasContent(score.detail)

  return (
    <li className="rounded-lg px-2 py-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex items-baseline gap-1.5 font-display text-base md:text-lg text-primary">
          <span className="lining-nums tabular-nums shrink-0">{rank}.</span>
          <span className="truncate">{score.displayName || 'Misafir'}</span>
        </span>
        <span className="flex items-baseline gap-3 shrink-0">
          {score.label && (
            <span className="label lining-nums tabular-nums">{score.label}</span>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Sil"
            title="Sil"
            className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
          >
            🗑
          </button>
        </span>
      </div>

      <div className="flex items-baseline gap-2 mt-0.5 pl-5">
        <span className="text-muted text-xs lining-nums tabular-nums">
          {formatDateTime(score.createdAt)}
        </span>
        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm text-gold hover:underline"
          >
            {open ? 'Yanıtları gizle' : 'Yanıtları gör'}
          </button>
        )}
      </div>

      {open && hasDetail && <Detail detail={score.detail} />}
    </li>
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
      <ul className="mt-2 pt-2 border-t border-line/60 space-y-2 pl-5">
        {detail.map((item, i) => (
          <AnswerItem key={i} item={item} index={i} />
        ))}
      </ul>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-line/60 flex flex-wrap gap-2 pl-5">
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
              <span className="label mr-1 lining-nums tabular-nums">{index + 1}.</span>
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
