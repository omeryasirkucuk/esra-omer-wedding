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

// A row of colour swatches (e.g. the entrance-sign background). Each option
// carries a `color` to paint the chip; the selected one gets the gold ring.
export function Swatches({ label, value, onChange, options }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1 flex gap-3 flex-wrap">
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className="flex flex-col items-center gap-1 group"
              title={o.label}
            >
              <span
                className={`block w-8 h-8 rounded-full transition ring-offset-2 ring-offset-bg ${
                  active ? 'ring-2 ring-gold' : 'ring-1 ring-line group-hover:ring-primary-soft'
                }`}
                style={{ background: o.color }}
              />
              <span
                className={`font-sans text-[10px] tracking-[0.08em] uppercase whitespace-nowrap transition ${
                  active ? 'text-primary' : 'text-muted group-hover:text-primary'
                }`}
              >
                {o.label}
              </span>
            </button>
          )
        })}
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
