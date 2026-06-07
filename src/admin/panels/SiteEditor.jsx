// Site editor panel: lets the couple edit everything visible on the guest site
// — names, the wedding date/time, venue, the two families, the event program,
// and the closing words. On mount it loads the stored content and deep-merges
// it over the defaults from wedding.js so every field is prefilled. Saving
// pushes the whole form state back to the API.
import { useEffect, useState } from 'react'
import { getSiteContent, saveSiteContent, AuthError } from '../adminApi'
import { wedding } from '../../data/wedding'
import { PROGRAM_ICONS, programIcon, iconToneClass } from '../../data/programIcons.js'

// Shared input styling so every field matches the rest of the admin surface.
const INPUT = 'w-full bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold'

// Istanbul is fixed at UTC+3; the site only ever describes one local timezone.
const TZ_OFFSET = '+03:00'

// Deep-merge stored content over the defaults. Objects merge recursively so a
// partially-stored object still inherits any missing keys from the defaults.
// Arrays (families, program) are taken wholesale from the stored value when
// present, otherwise the defaults are used.
function mergeDefaults(defaults, stored) {
  if (Array.isArray(defaults)) {
    return Array.isArray(stored) ? stored : defaults
  }
  if (defaults && typeof defaults === 'object') {
    const out = { ...defaults }
    const src = stored && typeof stored === 'object' ? stored : {}
    for (const key of Object.keys(defaults)) {
      out[key] = mergeDefaults(defaults[key], src[key])
    }
    // Keep any extra keys the server returns that the defaults do not know.
    for (const key of Object.keys(src)) {
      if (!(key in out)) out[key] = src[key]
    }
    return out
  }
  return stored === undefined || stored === null ? defaults : stored
}

// Convert a stored ISO string into the "YYYY-MM-DDTHH:mm" form a
// datetime-local input expects, expressed in Istanbul local time. We read the
// wall-clock components directly from the ISO string so the displayed value is
// independent of the admin's own browser timezone.
function isoToLocalInput(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return ''
  const [, y, mo, d, h, mi] = m
  return `${y}-${mo}-${d}T${h}:${mi}`
}

const TR_DATE = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const TR_WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })

function capitalize(s) {
  return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s
}

// From a datetime-local value, derive every date-related field the site shows.
// We build a Date pinned to Istanbul so the Turkish formatters render the
// intended wall-clock day/weekday regardless of the admin's local timezone.
function deriveDateFields(localValue) {
  const m = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, y, mo, d, h, mi] = m
  const pinned = new Date(`${y}-${mo}-${d}T${h}:${mi}:00${TZ_OFFSET}`)
  return {
    dateISO: `${y}-${mo}-${d}T${h}:${mi}:00${TZ_OFFSET}`,
    dateLabel: TR_DATE.format(pinned),
    dayLabel: capitalize(TR_WEEKDAY.format(pinned)),
    timeLabel: `${h}:${mi}`,
  }
}

export default function SiteEditor({ onAuthError }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let alive = true
    getSiteContent()
      .then((stored) => {
        if (alive) setForm(mergeDefaults(wedding, stored))
      })
      .catch((e) => {
        if (e instanceof AuthError) onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  // Patch a top-level field.
  function setField(key, value) {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Patch a nested venue field.
  function setVenue(key, value) {
    setSaved(false)
    setForm((f) => ({ ...f, venue: { ...f.venue, [key]: value } }))
  }

  // Patch a link-preview (meta) field.
  function setMeta(key, value) {
    setSaved(false)
    setForm((f) => ({ ...f, meta: { ...f.meta, [key]: value } }))
  }

  // Patch one of the two families in place (index 0 or 1).
  function setFamily(index, key, value) {
    setSaved(false)
    setForm((f) => ({
      ...f,
      families: f.families.map((fam, i) => (i === index ? { ...fam, [key]: value } : fam)),
    }))
  }

  // Patch a program row.
  function setProgram(index, key, value) {
    setSaved(false)
    setForm((f) => ({
      ...f,
      program: f.program.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }))
  }

  function addProgramRow() {
    setSaved(false)
    setForm((f) => ({
      ...f,
      program: [...f.program, { icon: 'sparkle', title: '', time: '' }],
    }))
  }

  function removeProgramRow(index) {
    setSaved(false)
    setForm((f) => ({ ...f, program: f.program.filter((_, i) => i !== index) }))
  }

  // When the single datetime picker changes, recompute every derived field.
  function handleDateChange(localValue) {
    setSaved(false)
    const derived = deriveDateFields(localValue)
    if (!derived) return
    setForm((f) => ({ ...f, ...derived }))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      await saveSiteContent(form)
      setSaved(true)
    } catch (e) {
      if (e instanceof AuthError) onAuthError()
      else setSaveError('Kaydedilemedi, tekrar deneyin')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!form) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Couple --------------------------------------------------------- */}
      <Section title="Çift">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Gelin">
            <input
              type="text"
              value={form.bride}
              onChange={(e) => setField('bride', e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Damat">
            <input
              type="text"
              value={form.groom}
              onChange={(e) => setField('groom', e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      {/* Date & time --------------------------------------------------- */}
      <Section title="Tarih & Saat">
        <Field label="Düğün Tarihi ve Saati (İstanbul, +03:00)">
          <input
            type="datetime-local"
            value={isoToLocalInput(form.dateISO)}
            onChange={(e) => handleDateChange(e.target.value)}
            className={INPUT}
          />
          <span className="text-muted text-xs mt-1">
            Bu alan değiştirildiğinde aşağıdaki etiketler otomatik güncellenir.
          </span>
        </Field>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <Field label="Tarih Etiketi">
            <input
              type="text"
              value={form.dateLabel}
              onChange={(e) => setField('dateLabel', e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Gün Etiketi">
            <input
              type="text"
              value={form.dayLabel}
              onChange={(e) => setField('dayLabel', e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Saat Etiketi">
            <input
              type="text"
              value={form.timeLabel}
              onChange={(e) => setField('timeLabel', e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      {/* Venue --------------------------------------------------------- */}
      <Section title="Mekân">
        <Field label="Mekân Adı">
          <input
            type="text"
            value={form.venue.name}
            onChange={(e) => setVenue('name', e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Adres" className="mt-4">
          <textarea
            rows={2}
            value={form.venue.address}
            onChange={(e) => setVenue('address', e.target.value)}
            className={`${INPUT} resize-y`}
          />
        </Field>
        <Field label="Harita Araması (Yol Tarifi)" className="mt-4">
          <textarea
            rows={2}
            value={form.venue.mapsQuery}
            onChange={(e) => setVenue('mapsQuery', e.target.value)}
            className={`${INPUT} resize-y`}
          />
          <span className="text-muted text-xs mt-1">
            "Yol Tarifi Al" düğmesi bu metni Google Haritalar'da arar.
          </span>
        </Field>
      </Section>

      {/* Families ------------------------------------------------------ */}
      <Section title="Aileler">
        <div className="grid sm:grid-cols-2 gap-4">
          {form.families.map((fam, i) => (
            <div key={i} className="card-soft p-4 flex flex-col gap-4">
              <p className="label-gold">{i + 1}. Aile</p>
              <Field label="Anne · Baba">
                <input
                  type="text"
                  value={fam.parents}
                  onChange={(e) => setFamily(i, 'parents', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Soyadı">
                <input
                  type="text"
                  value={fam.surname}
                  onChange={(e) => setFamily(i, 'surname', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* Program ------------------------------------------------------- */}
      <Section title="Etkinlik Programı">
        <div className="flex flex-col gap-3">
          {form.program.map((row, i) => (
            <div
              key={i}
              className="card-soft p-3 flex flex-col sm:flex-row sm:items-end gap-3"
            >
              <Field label="Simge" className="w-full sm:w-44">
                <div className="flex items-center gap-2">
                  {/* Preview of the chosen glyph so the selection is visible. */}
                  <span
                    className={`shrink-0 text-2xl leading-none w-7 text-center ${iconToneClass(programIcon(row.icon).tone)}`}
                    aria-hidden="true"
                  >
                    {programIcon(row.icon).glyph}
                  </span>
                  <select
                    value={row.icon}
                    onChange={(e) => setProgram(i, 'icon', e.target.value)}
                    className={INPUT}
                  >
                    {PROGRAM_ICONS.map((ic) => (
                      <option key={ic.key} value={ic.key}>
                        {ic.glyph}  {ic.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Başlık" className="flex-1">
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => setProgram(i, 'title', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Saat" className="w-full sm:w-28">
                <input
                  type="text"
                  value={row.time}
                  onChange={(e) => setProgram(i, 'time', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <button
                type="button"
                onClick={() => removeProgramRow(i)}
                aria-label="Satırı sil"
                title="Satırı sil"
                className="text-muted hover:text-rose transition-colors py-2 sm:py-0 sm:pb-2"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addProgramRow}
          className="mt-3 text-gold border border-gold/50 rounded px-3 py-2 hover:bg-gold/10 transition-colors"
        >
          + Satır Ekle
        </button>
      </Section>

      {/* Words --------------------------------------------------------- */}
      <Section title="Sözler">
        <Field label="Davet Sözü">
          <textarea
            rows={2}
            value={form.quote}
            onChange={(e) => setField('quote', e.target.value)}
            className={`${INPUT} resize-y`}
          />
        </Field>
        <Field label="Kapanış" className="mt-4">
          <input
            type="text"
            value={form.closing}
            onChange={(e) => setField('closing', e.target.value)}
            className={INPUT}
          />
        </Field>
      </Section>

      {/* Link preview --------------------------------------------------- */}
      <Section title="Bağlantı Önizleme">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site Başlığı">
            <input
              type="text"
              value={form.meta?.title || ''}
              onChange={(e) => setMeta('title', e.target.value)}
              className={INPUT}
            />
            <span className="text-muted text-xs mt-1">
              Sekme başlığı ve paylaşım kartlarında görünür.
            </span>
          </Field>
          <Field label="Site Adresi (https://…)">
            <input
              type="url"
              value={form.meta?.siteUrl || ''}
              onChange={(e) => setMeta('siteUrl', e.target.value)}
              className={INPUT}
            />
            <span className="text-muted text-xs mt-1">
              WhatsApp/sosyal önizlemelerindeki bağlantı ve görsel adresi.
            </span>
          </Field>
        </div>
      </Section>

      {/* Sticky save bar ---------------------------------------------- */}
      <div className="sticky bottom-0 -mx-1 mt-6 bg-bg/90 backdrop-blur border-t border-line py-3 flex items-center justify-end gap-4">
        {saveError && <span className="text-rose text-sm">{saveError}</span>}
        {saved && <span className="text-gold text-sm">Kaydedildi</span>}
        <button type="button" onClick={handleSave} className="btn-lux" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}

// A titled form section with a card-soft body.
function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className="font-display text-xl text-primary mb-3">{title}</h3>
      <div className="card-soft p-4">{children}</div>
    </section>
  )
}

// A labelled field wrapper matching the RSVP panel's Field.
function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}
