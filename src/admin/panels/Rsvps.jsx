// RSVP panel: a scrollable list of attendance records the couple can manage.
// Shows live totals at the top, a compact "add attendee" form, and per-row
// inline editing of adult/child counts plus delete.
import { useEffect, useMemo, useState } from 'react'
import { getRsvps, addRsvp, updateRsvp, deleteRsvp, getSiteContent, getGifts } from '../adminApi'
import { formatDateTime } from '../format'
import { confirmDialog } from '../../lib/confirm.js'
import PanelControls from '../PanelControls.jsx'
import SortSelect from '../SortSelect.jsx'
import Stat from '../Stat.jsx'
import FilterRow from '../FilterRow.jsx'
import Field from '../Field.jsx'
import { matchesQuery, compareNames, compareNewest } from '../search.js'
import { GROUP_OPTIONS, sideOptions, TagSelect } from '../rsvpTags.jsx'

// Ordering options + comparators for the RSVP list.
const RSVP_SORTS = [
  { value: 'recent', label: 'Yeni eklenen' },
  { value: 'oldest', label: 'Eski eklenen' },
  { value: 'name', label: 'İsim (A→Z)' },
  { value: 'people', label: 'En çok kişi' },
]
const fullName = (r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`
const rsvpComparators = {
  recent: (a, b) => compareNewest(a.createdAt, b.createdAt),
  oldest: (a, b) => -compareNewest(a.createdAt, b.createdAt),
  name: (a, b) => compareNames(fullName(a), fullName(b)),
  people: (a, b) => (b.guests ?? 0) + (b.children ?? 0) - ((a.guests ?? 0) + (a.children ?? 0)),
}

// Coerce a possibly-empty input value into a non-negative integer.
function toCount(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function Rsvps({ onAuthError }) {
  const [rsvps, setRsvps] = useState(null)
  const [error, setError] = useState(false)
  // Add-form state, kept controlled so we can reset it after a successful add.
  const [form, setForm] = useState({ firstName: '', lastName: '', guests: 1, children: 0, group: '', side: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [groupFilter, setGroupFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')
  const [noteFilter, setNoteFilter] = useState('all')
  // Couple's names for the "side" tag labels (fall back to generic words).
  const [couple, setCouple] = useState({ bride: '', groom: '' })
  // Attendees with at least one linked gift record get a star next to their name.
  const [giftedIds, setGiftedIds] = useState(() => new Set())

  useEffect(() => {
    let alive = true
    getRsvps()
      .then((d) => alive && setRsvps(d.rsvps || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    getSiteContent()
      .then((d) => alive && setCouple({ bride: d?.bride || '', groom: d?.groom || '' }))
      .catch(() => {})
    getGifts()
      .then((d) => {
        if (!alive) return
        setGiftedIds(new Set((d.gifts || []).map((g) => g.rsvpId).filter(Boolean)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [onAuthError])

  const sideOpts = useMemo(() => sideOptions(couple.bride, couple.groom), [couple])
  // Filter-pill choices reuse the tag metadata; "all" leads each row.
  const groupFilters = [{ value: 'all', label: 'Tümü' }, ...GROUP_OPTIONS.filter((o) => o.value)]
  const sideFilters = [{ value: 'all', label: 'Tümü' }, ...sideOpts.filter((o) => o.value)]

  // Distinct notes, alphabetically (Turkish), for the note filter dropdown.
  const noteOptions = useMemo(() => {
    const set = new Set((rsvps || []).map((r) => (r.note || '').trim()).filter(Boolean))
    const sorted = [...set].sort((a, b) => a.localeCompare(b, 'tr'))
    return [{ value: 'all', label: 'Tümü' }, ...sorted.map((n) => ({ value: n, label: n }))]
  }, [rsvps])
  // Guard against a stale selection after a note is edited/removed.
  const activeNote = noteOptions.some((o) => o.value === noteFilter) ? noteFilter : 'all'

  // "Clear filters" only matters when something is actually narrowing the list
  // (search counts as a filter; ordering does not).
  const hasActiveFilter =
    groupFilter !== 'all' || sideFilter !== 'all' || activeNote !== 'all' || query.trim() !== ''
  function clearFilters() {
    setGroupFilter('all')
    setSideFilter('all')
    setNoteFilter('all')
    setQuery('')
  }

  // Group/side tag filters, then name search, then the chosen ordering.
  const filtered = useMemo(
    () =>
      (rsvps || [])
        .filter((r) => groupFilter === 'all' || (r.group || '') === groupFilter)
        .filter((r) => sideFilter === 'all' || (r.side || '') === sideFilter)
        .filter((r) => activeNote === 'all' || (r.note || '').trim() === activeNote)
        .filter((r) => matchesQuery(query, r.firstName, r.lastName, r.note))
        .sort(rsvpComparators[sort] || rsvpComparators.recent),
    [rsvps, query, sort, groupFilter, sideFilter, activeNote],
  )

  // Top summary tracks the filtered view, so the counts reflect the active
  // group/side/note/search filters rather than the whole guest list.
  const totals = useMemo(() => {
    const adults = filtered.reduce((sum, r) => sum + (r.guests ?? 0), 0)
    const children = filtered.reduce((sum, r) => sum + (r.children ?? 0), 0)
    return { entries: filtered.length, adults, children, people: adults + children }
  }, [filtered])

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
        group: form.group,
        side: form.side,
        note: form.note.trim(),
      })
      setRsvps((prev) => [created, ...(prev || [])])
      setForm({ firstName: '', lastName: '', guests: 1, children: 0, group: '', side: '', note: '' })
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

  // Persist the free-text note on blur, if it actually changed.
  async function handleNoteBlur(entry, rawValue) {
    const value = rawValue.trim().slice(0, 200)
    if ((entry.note || '') === value) return
    setRsvps((prev) => (prev || []).map((r) => (r.id === entry.id ? { ...r, note: value } : r)))
    try {
      await updateRsvp({ id: entry.id, note: value })
    } catch (err) {
      handleError(err)
    }
  }

  // Persist a tag change (group/side) immediately; optimistic local update.
  async function handleTagChange(entry, field, value) {
    if ((entry[field] || '') === value) return
    setRsvps((prev) => (prev || []).map((r) => (r.id === entry.id ? { ...r, [field]: value } : r)))
    try {
      await updateRsvp({ id: entry.id, [field]: value })
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
        <Field label="Grup" className="flex-1 min-w-[7rem]">
          <select
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Yakınlık" className="flex-1 min-w-[7rem]">
          <select
            value={form.side}
            onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          >
            {sideOpts.map((o) => (
              <option key={o.value || 'none'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Not" className="flex-1 min-w-[10rem] basis-full sm:basis-auto">
          <input
            type="text"
            value={form.note}
            placeholder="örn. iş - üniversiteden"
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
          />
        </Field>
        <button type="submit" className="btn-lux w-full sm:w-auto" disabled={adding}>
          {adding ? 'Ekleniyor…' : 'Ekle'}
        </button>
        {formError && <p className="text-rose text-sm w-full">{formError}</p>}
      </form>

      <PanelControls
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        sortOptions={RSVP_SORTS}
      />

      {/* Tag filters, grouped into one card so the stacked rows read as a
          deliberate block, with a clear-all action in the header. */}
      <div className="card-soft p-3 sm:p-4 mb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="label-gold">Filtreler</span>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilter}
            className="label-gold transition-colors hover:text-rose disabled:opacity-30 disabled:cursor-default disabled:hover:text-current"
          >
            Filtreleri Temizle
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <FilterRow label="Grup" value={groupFilter} onChange={setGroupFilter} options={groupFilters} />
          <FilterRow label="Yakınlık" value={sideFilter} onChange={setSideFilter} options={sideFilters} />
          {noteOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="label w-20 shrink-0">Not</span>
              <SortSelect value={activeNote} onChange={setNoteFilter} options={noteOptions} />
            </div>
          )}
        </div>
      </div>

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
                <div className="sm:block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-primary flex items-center gap-2 min-w-0">
                      <span className="truncate">
                        {r.firstName} {r.lastName}
                      </span>
                      {giftedIds.has(r.id) && (
                        <span
                          className="text-gold shrink-0"
                          title="Hediye kaydı var"
                          aria-label="Hediye kaydı var"
                        >
                          ★
                        </span>
                      )}
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
                  {/* Tag chips: social group + which side of the couple. */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <TagSelect
                      value={r.group || ''}
                      onChange={(v) => handleTagChange(r, 'group', v)}
                      options={GROUP_OPTIONS}
                      tone="group"
                    />
                    <TagSelect
                      value={r.side || ''}
                      onChange={(v) => handleTagChange(r, 'side', v)}
                      options={sideOpts}
                      tone="side"
                    />
                  </div>
                  {/* Free-text custom label, saved on blur. */}
                  <input
                    type="text"
                    defaultValue={r.note || ''}
                    key={`note-${r.id}-${r.note || ''}`}
                    placeholder="Not ekle"
                    onBlur={(e) => handleNoteBlur(r, e.target.value)}
                    className="mt-1.5 w-full max-w-xs box-border bg-bg border border-line rounded px-2.5 py-1 text-sm text-ink outline-none focus:border-gold"
                  />
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

