// Add-gift form. The person field is a lightweight combobox over the RSVP
// list: picking a suggestion links the gift to that attendee (rsvpId → the star
// on the Katılımcılar tab) and prefills their group/side tags; free text stays
// an unlinked entry. The value fields switch with the chosen kind — cash shows
// an amount, gold shows subtype + karat + piece count + grams (karat and grams
// pre-fill per subtype but stay editable, e.g. bracelets vary).
//
// With `lockedAttendee` ({ id, name, group, side }) the person is fixed — the
// combobox is replaced by a read-only chip and the gift is linked to that
// attendee. Used by the Katılımcılar tab to create-and-link a gift in place.
import { useMemo, useState } from 'react'
import Field from '../Field.jsx'
import { matchesQuery } from '../search.js'
import { GROUP_OPTIONS } from '../rsvpTags.jsx'
import GiftValueFields from './GiftValueFields.jsx'
import { defaultGrams, defaultKarat, validateGiftValues } from './giftModel.js'

const INPUT_CLASS =
  'w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold'

const INITIAL_GOLD_TYPE = 'ceyrek'
const initialForm = (locked) => ({
  name: locked?.name || '',
  rsvpId: locked?.id || '',
  kind: 'try',
  amount: '',
  goldType: INITIAL_GOLD_TYPE,
  karat: String(defaultKarat(INITIAL_GOLD_TYPE)),
  count: 1,
  grams: String(defaultGrams(INITIAL_GOLD_TYPE)),
  group: locked?.group || '',
  side: locked?.side || '',
  note: '',
})

export default function GiftForm({ rsvps, sideOpts, onAdd, lockedAttendee = null, submitLabel = 'Ekle' }) {
  const [form, setForm] = useState(() => initialForm(lockedAttendee))
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  // Attendee suggestions for the typed name (hidden once a pick was made, and
  // never shown when the person is locked).
  const suggestions = useMemo(() => {
    if (lockedAttendee) return []
    const query = form.name.trim()
    if (!query || form.rsvpId) return []
    return (rsvps || [])
      .filter((r) => matchesQuery(query, r.firstName, r.lastName))
      .slice(0, 6)
  }, [rsvps, form.name, form.rsvpId, lockedAttendee])

  function handleNameChange(value) {
    // Any manual edit breaks the link — the name no longer matches the pick.
    setForm((f) => ({ ...f, name: value, rsvpId: '' }))
    setSuggestionsOpen(true)
  }

  function pickAttendee(r) {
    setForm((f) => ({
      ...f,
      name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
      rsvpId: r.id,
      // Prefill tags from the attendee unless already chosen by hand.
      group: f.group || r.group || '',
      side: f.side || r.side || '',
    }))
    setSuggestionsOpen(false)
  }

  function validate() {
    if (!form.name.trim()) return 'İsim girin'
    return validateGiftValues(form)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (adding) return
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setAdding(true)
    try {
      await onAdd({
        name: form.name.trim(),
        rsvpId: form.rsvpId,
        kind: form.kind,
        amount: Number(form.amount) || 0,
        goldType: form.goldType,
        karat: Number(form.karat) || 0,
        count: Number(form.count) || 0,
        grams: Number(form.grams) || 0,
        group: form.group,
        side: form.side,
        note: form.note.trim(),
      })
      setForm(initialForm(lockedAttendee))
    } catch {
      setError('Eklenemedi, tekrar deneyin')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-soft p-4 mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3"
    >
      {lockedAttendee ? (
        <Field label="Kişi" className="flex-1 min-w-[11rem]">
          <div className="flex items-center gap-1.5 box-border w-full px-3 py-2 rounded border border-gold/50 bg-gold/5 text-ink">
            <span className="text-gold shrink-0">★</span>
            <span className="truncate">{lockedAttendee.name}</span>
          </div>
        </Field>
      ) : (
        <Field label="Kişi" className="flex-1 min-w-[11rem] relative">
        <input
          type="text"
          value={form.name}
          placeholder="İsim yazın veya listeden seçin"
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setSuggestionsOpen(false)}
          className={INPUT_CLASS}
        />
        {form.rsvpId && (
          <span className="absolute right-2.5 bottom-2.5 text-gold pointer-events-none" title="Katılımcıya bağlı">
            ★
          </span>
        )}
        {suggestionsOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 card-soft z-30 overflow-hidden">
            {suggestions.map((r) => (
              <button
                key={r.id}
                type="button"
                // preventDefault keeps the input focused so blur doesn't
                // dismiss the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickAttendee(r)}
                className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-gold/10 transition-colors"
              >
                {r.firstName} {r.lastName}
              </button>
            ))}
          </div>
        )}
        </Field>
      )}
      <GiftValueFields values={form} onPatch={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <Field label="Grup" className="flex-1 min-w-[7rem]">
        <select
          value={form.group}
          onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
          className={INPUT_CLASS}
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
          className={INPUT_CLASS}
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
          placeholder="örn. düğünde takıldı"
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          className={INPUT_CLASS}
        />
      </Field>
      <button type="submit" className="btn-lux w-full sm:w-auto" disabled={adding}>
        {adding ? 'Ekleniyor…' : submitLabel}
      </button>
      {error && <p className="text-rose text-sm w-full">{error}</p>}
    </form>
  )
}
