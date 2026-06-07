// Attendee tag metadata + a compact chip-styled <select> used to assign them.
// Two dimensions: `group` (social circle) and `side` (which of the couple the
// guest belongs to). The side labels show the real bride/groom names pulled from
// the wedding info, falling back to generic words before content loads.

// Social-circle groups. The leading '' entry is the "untagged" placeholder.
export const GROUP_OPTIONS = [
  { value: '', label: 'Grup' },
  { value: 'aile', label: 'Aile' },
  { value: 'arkadas', label: 'Arkadaş' },
  { value: 'akraba', label: 'Akraba' },
  { value: 'is', label: 'İş' },
]

export function groupLabel(value) {
  return GROUP_OPTIONS.find((o) => o.value === value && o.value)?.label || ''
}

// Side options, labelled with the couple's names (e.g. "Esra", "Ömer", "Çift").
export function sideOptions(bride, groom) {
  return [
    { value: '', label: 'Yakınlık' },
    { value: 'gelin', label: bride || 'Gelin' },
    { value: 'damat', label: groom || 'Damat' },
    { value: 'cift', label: 'Çift' },
  ]
}

export function sideLabel(value, bride, groom) {
  if (value === 'gelin') return bride || 'Gelin'
  if (value === 'damat') return groom || 'Damat'
  if (value === 'cift') return 'Çift'
  return ''
}

// Color tones so the two tag dimensions read as distinct chips.
const TONES = {
  group: 'bg-sage/15 border-sage/50 text-sage',
  side: 'bg-gold/15 border-gold/60 text-gold',
}

// A pill-shaped select: muted/outlined when unset, tinted once a value is chosen.
export function TagSelect({ value, onChange, options, tone = 'group' }) {
  const set = Boolean(value)
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full border pl-2.5 pr-6 py-0.5 text-xs cursor-pointer outline-none focus:border-gold transition ${
          set ? TONES[tone] : 'bg-bg border-line text-muted'
        }`}
      >
        {options.map((o) => (
          <option key={o.value || 'none'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </span>
  )
}
