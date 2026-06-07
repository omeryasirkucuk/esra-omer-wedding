// RSVP panel: a scrollable list of attendance records the couple can manage.
// Shows live totals at the top, a compact "add attendee" form, and per-row
// inline editing of adult/child counts plus delete.
import { useEffect, useMemo, useState } from 'react'
import { getRsvps, addRsvp, updateRsvp, deleteRsvp } from '../adminApi'
import { formatDateTime } from '../format'
import { confirmDialog } from '../../lib/confirm.js'
import SearchBox from '../SearchBox.jsx'
import { matchesQuery } from '../search.js'

// Coerce a possibly-empty input value into a non-negative integer.
function toCount(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function Rsvps({ onAuthError }) {
  const [rsvps, setRsvps] = useState(null)
  const [error, setError] = useState(false)
  // Add-form state, kept controlled so we can reset it after a successful add.
  const [form, setForm] = useState({ firstName: '', lastName: '', guests: 1, children: 0 })
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    getRsvps()
      .then((d) => alive && setRsvps(d.rsvps || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Live totals — recomputed whenever the list changes.
  const totals = useMemo(() => {
    const list = rsvps || []
    const adults = list.reduce((sum, r) => sum + (r.guests ?? 0), 0)
    const children = list.reduce((sum, r) => sum + (r.children ?? 0), 0)
    return { entries: list.length, adults, children, people: adults + children }
  }, [rsvps])

  // Name search: match on first/last name, case- and accent-insensitive.
  const filtered = useMemo(
    () => (rsvps || []).filter((r) => matchesQuery(query, r.firstName, r.lastName)),
    [rsvps, query],
  )

  // Surface a 401 as a session drop; everything else is a soft inline error.
  const handleError = (e, setLocal) => {
    if (e.name === 'AuthError') onAuthError()
    else if (setLocal) setLocal()
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (adding) return
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName && !lastName) {
      setFormError('Ad veya soyad girin')
      return
    }
    setFormError('')
    setAdding(true)
    try {
      const created = await addRsvp({
        firstName,
        lastName,
        guests: toCount(form.guests),
        children: toCount(form.children),
      })
      setRsvps((prev) => [created, ...(prev || [])])
      setForm({ firstName: '', lastName: '', guests: 1, children: 0 })
    } catch (err) {
      handleError(err, () => setFormError('Eklenemedi, tekrar deneyin'))
    } finally {
      setAdding(false)
    }
  }

  // Persist an edited count on blur, then mirror the server's record locally.
  async function handleCountBlur(entry, field, rawValue) {
    const value = toCount(rawValue)
    if ((entry[field] ?? 0) === value) return
    try {
      const updated = await updateRsvp({ id: entry.id, [field]: value })
      setRsvps((prev) =>
        (prev || []).map((r) => (r.id === entry.id ? { ...r, ...updated } : r)),
      )
    } catch (err) {
      handleError(err)
    }
  }

  async function handleDelete(entry) {
    const name = `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim() || 'bu kayıt'
    if (!(await confirmDialog(`${name} silinsin mi?`))) return
    try {
      await deleteRsvp(entry.id)
      setRsvps((prev) => (prev || []).filter((r) => r.id !== entry.id))
    } catch (err) {
      handleError(err)
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!rsvps) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div>
      {/* Live totals summary. */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Stat label="Kayıt" value={totals.entries} />
        <Stat label="Yetişkin" value={totals.adults} />
        <Stat label="Çocuk" value={totals.children} />
        <Stat label="Toplam Kişi" value={totals.people} highlight />
      </div>

      {/* Compact add-attendee form. */}
      <form
        onSubmit={handleAdd}
        className="card-soft p-4 mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3"
      >
        <Field label="Ad" className="flex-1 min-w-[7rem]">
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          />
        </Field>
        <Field label="Soyad" className="flex-1 min-w-[7rem]">
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          />
        </Field>
        <Field label="Yetişkin" className="w-full sm:w-20">
          <input
            type="number"
            min="0"
            value={form.guests}
            onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          />
        </Field>
        <Field label="Çocuk" className="w-full sm:w-20">
          <input
            type="number"
            min="0"
            value={form.children}
            onChange={(e) => setForm((f) => ({ ...f, children: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          />
        </Field>
        <button type="submit" className="btn-lux w-full sm:w-auto" disabled={adding}>
          {adding ? 'Ekleniyor…' : 'Ekle'}
        </button>
        {formError && <p className="text-rose text-sm w-full">{formError}</p>}
      </form>

      <SearchBox value={query} onChange={setQuery} />

      {rsvps.length === 0 ? (
        <p className="text-muted text-center py-10">Henüz katılım yok</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-10">Eşleşen kayıt yok</p>
      ) : (
        <div className="card-soft scroll-gold overflow-auto max-h-[60vh]">
          {/* Header row — hidden on very small screens to keep rows readable. */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-line label-gold sticky top-0 bg-surface z-10">
            <span>Ad Soyad</span>
            <span className="text-right w-20">Yetişkin</span>
            <span className="text-right w-20">Çocuk</span>
            <span className="text-right w-40">Tarih</span>
            <span className="w-8" />
          </div>

          <ul>
            {filtered.map((r) => (
              <li
                key={r.id}
                className="px-4 py-3 border-b border-line/60 last:border-0 flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4 sm:items-center"
              >
                {/* Mobile: name on the left, delete pinned to the right of the
                    same line. From sm up the delete button moves to its grid
                    cell via the `sm:contents` wrapper below. */}
                <div className="flex items-center justify-between gap-2 sm:block">
                  <span className="font-display text-lg text-primary flex items-center gap-2 min-w-0">
                    <span className="truncate">
                      {r.firstName} {r.lastName}
                    </span>
                    {r.addedByAdmin && (
                      <span className="label-gold text-[0.55rem] border border-gold/50 rounded px-1.5 py-0.5 shrink-0">
                        elle eklendi
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    aria-label="Sil"
                    title="Sil"
                    className="shrink-0 text-muted hover:text-rose transition-colors sm:hidden"
                  >
                    🗑
                  </button>
                </div>
                {/* Counts + date. On mobile they wrap onto their own line(s);
                    from sm up `sm:contents` drops them into the grid columns. */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 sm:mt-0 sm:contents">
                  <label className="flex items-center gap-1 sm:justify-end sm:w-20">
                    <span className="label sm:hidden">Yetişkin:</span>
                    <input
                      type="number"
                      min="0"
                      defaultValue={r.guests ?? 0}
                      key={`g-${r.id}-${r.guests ?? 0}`}
                      onBlur={(e) => handleCountBlur(r, 'guests', e.target.value)}
                      className="w-16 box-border bg-bg border border-line rounded px-2 py-1 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
                    />
                  </label>
                  <label className="flex items-center gap-1 sm:justify-end sm:w-20">
                    <span className="label sm:hidden">Çocuk:</span>
                    <input
                      type="number"
                      min="0"
                      defaultValue={r.children ?? 0}
                      key={`c-${r.id}-${r.children ?? 0}`}
                      onBlur={(e) => handleCountBlur(r, 'children', e.target.value)}
                      className="w-16 box-border bg-bg border border-line rounded px-2 py-1 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
                    />
                  </label>
                  <span className="text-muted text-sm whitespace-nowrap basis-full sm:basis-auto sm:text-right sm:w-40 sm:self-center lining-nums tabular-nums">
                    {formatDateTime(r.createdAt)}
                  </span>
                  {/* Desktop-only delete cell (mobile uses the header-row one). */}
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    aria-label="Sil"
                    title="Sil"
                    className="hidden sm:block text-muted hover:text-rose transition-colors sm:w-8 sm:text-center"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// A small totals chip.
function Stat({ label, value, highlight }) {
  return (
    <div
      className={`card-soft px-4 py-2 text-center flex-1 min-w-[5.5rem] ${
        highlight ? 'border-gold' : ''
      }`}
    >
      <p className="label">{label}</p>
      <p
        className={`font-display text-2xl lining-nums tabular-nums ${
          highlight ? 'text-gold' : 'text-primary'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

// A labelled form field wrapper.
function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}
