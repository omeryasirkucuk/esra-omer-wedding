// One labelled row of filter pills. The active value gets a gold fill.
export default function FilterRow({ label, value, onChange, options }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label w-20 shrink-0">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-sm border transition ${
            value === o.value
              ? 'bg-gold text-surface border-gold'
              : 'bg-bg text-muted border-line hover:border-gold'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
