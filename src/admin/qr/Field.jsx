// Small labelled input helpers shared by the QR poster forms, styled to match
// the rest of the admin (gold focus ring, hairline border).
const INPUT =
  'mt-1 w-full bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold'

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT}
      />
    </label>
  )
}

// Pill-style segmented control (e.g. orientation, mark), matching the admin tabs.
export function Segmented({ label, value, onChange, options }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1 flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`font-sans uppercase text-xs tracking-[0.15em] px-4 py-2 rounded-full border transition ${
              value === o.id
                ? 'border-gold text-primary bg-surface'
                : 'border-line text-muted hover:text-primary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${INPUT} resize-y`}
      />
    </label>
  )
}
