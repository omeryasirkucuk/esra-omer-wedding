// Styled in-page dialog (no native modal) for wiring an attendee to gift
// records from the Katılımcılar tab. Shows the gifts already linked to this
// person as removable chips, lets you search the ledger and attach an existing
// gift, or create-and-link a brand-new one in place. Attaching is how a
// collective gift — one piece several guests pooled for — earns a star on every
// contributor without duplicating the record.
import { useEffect, useMemo, useState } from 'react'
import { matchesQuery } from '../search.js'
import { giftRsvpIds, giftSummaryLabel } from './giftModel.js'
import GiftForm from './GiftForm.jsx'

export default function LinkGiftDialog({
  attendee,
  gifts,
  sideOpts,
  onLink,
  onUnlink,
  onCreate,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)

  const attendeeName = `${attendee.firstName ?? ''} ${attendee.lastName ?? ''}`.trim()

  // Close on Escape, matching the confirm/alert dialogs' feel.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const linked = useMemo(
    () => (gifts || []).filter((g) => giftRsvpIds(g).includes(attendee.id)),
    [gifts, attendee.id],
  )

  // Ledger entries not yet linked to this person, matched against the search.
  const results = useMemo(() => {
    if (!query.trim()) return []
    const linkedIds = new Set(linked.map((g) => g.id))
    return (gifts || [])
      .filter((g) => !linkedIds.has(g.id) && matchesQuery(query, g.name, g.note))
      .slice(0, 8)
  }, [gifts, linked, query])

  // A gift's own name only adds information when it differs from the attendee
  // (i.e. a collective/other-name entry); otherwise show just what was given.
  const giftText = (g) =>
    g.name && g.name !== attendeeName ? `${g.name} — ${giftSummaryLabel(g)}` : giftSummaryLabel(g)

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-4 overflow-auto"
      style={{ background: 'rgba(47,62,77,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-soft w-full max-w-md p-5 my-6 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="label-gold">Hediye Bağla</p>
            <p className="font-display text-xl text-primary truncate">{attendeeName || 'Katılımcı'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="shrink-0 text-muted hover:text-rose transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Already-linked gifts, each removable. */}
        <p className="label mb-1.5">Bağlı hediyeler</p>
        {linked.length === 0 ? (
          <p className="text-muted text-sm mb-4">Henüz bağlı hediye yok</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {linked.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/5 pl-3 pr-1.5 py-1 text-sm text-ink"
              >
                <span className="truncate max-w-[16rem]">{giftText(g)}</span>
                <button
                  type="button"
                  onClick={() => run(() => onUnlink(g.id))}
                  disabled={busy}
                  aria-label="Bağı kaldır"
                  title="Bağı kaldır"
                  className="text-muted hover:text-rose transition-colors disabled:opacity-40"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search the ledger and attach an existing gift. */}
        <p className="label mb-1.5">Mevcut hediyeye bağla</p>
        <input
          type="text"
          value={query}
          placeholder="Hediye ara (isim veya not)"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
        />
        {query.trim() && (
          <div className="mt-1.5 max-h-52 overflow-auto scroll-gold rounded border border-line divide-y divide-line/60">
            {results.length === 0 ? (
              <p className="text-muted text-sm px-3 py-2">Eşleşen hediye yok</p>
            ) : (
              results.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => run(() => onLink(g.id))}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-gold/10 transition-colors disabled:opacity-40"
                >
                  {giftText(g)}
                </button>
              ))
            )}
          </div>
        )}

        {/* Create-and-link a new gift when it isn't in the ledger yet. */}
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="label-gold mt-4 transition-colors hover:text-rose"
        >
          {showNew ? '− Yeni hediye' : '+ Yeni hediye oluştur'}
        </button>
        {showNew && (
          <div className="mt-2">
            <GiftForm
              rsvps={[]}
              sideOpts={sideOpts}
              lockedAttendee={{
                id: attendee.id,
                name: attendeeName,
                group: attendee.group || '',
                side: attendee.side || '',
              }}
              submitLabel="Ekle ve bağla"
              onAdd={async (payload) => {
                await onCreate(payload)
                setShowNew(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
