// Inline editor that replaces a gift row when the pencil is tapped. Unlike the
// add form there is no attendee combobox — the person's attendee link
// (`rsvpId`/`rsvpIds`, the star on the Katılımcılar tab) is managed there and
// left untouched here; this form only corrects the record itself: the name, the
// kind (TL/Dolar/Euro/Altın), the gold subtype + karat, the value, tags and
// note. Shares the value inputs with the add form via GiftValueFields.
import { useState } from 'react'
import Field from '../Field.jsx'
import { GROUP_OPTIONS } from '../rsvpTags.jsx'
import GiftValueFields from './GiftValueFields.jsx'
import { defaultGrams, defaultKarat, giftKarat, validateGiftValues } from './giftModel.js'

const INPUT_CLASS =
  'w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold'

// Seed the form from the stored gift. Non-gold entries still get sensible gold
// defaults (çeyrek / 22 ayar) so switching the kind to Altın is immediately
// valid without hunting for a weight.
function fromGift(g) {
  const gold = g.kind === 'gold'
  const goldType = g.goldType || 'ceyrek'
  return {
    name: g.name || '',
    kind: g.kind || 'try',
    amount: gold ? '' : String(g.amount ?? ''),
    goldType,
    karat: String(gold ? giftKarat(g) : defaultKarat('ceyrek')),
    count: gold ? g.count || 1 : 1,
    grams: gold ? String(g.grams ?? '') : String(defaultGrams('ceyrek') ?? ''),
    group: g.group || '',
    side: g.side || '',
    note: g.note || '',
  }
}

export default function GiftEditForm({ gift, sideOpts, onSave, onCancel }) {
  const [form, setForm] = useState(() => fromGift(gift))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    if (!form.name.trim()) {
      setError('İsim girin')
      return
    }
    const problem = validateGiftValues(form)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave({
        id: gift.id,
        name: form.name.trim(),
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
    } catch {
      setError('Kaydedilemedi, tekrar deneyin')
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-soft p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 border border-gold/40"
    >
      <Field label="Kişi" className="flex-1 min-w-[11rem]">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={INPUT_CLASS}
          autoFocus
        />
      </Field>
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
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button type="submit" className="btn-lux flex-1 sm:flex-none" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label-gold px-2 transition-colors hover:text-rose"
        >
          Vazgeç
        </button>
      </div>
      {error && <p className="text-rose text-sm w-full">{error}</p>}
    </form>
  )
}
