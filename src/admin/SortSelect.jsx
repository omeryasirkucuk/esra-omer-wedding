// Reusable ordering dropdown for the admin panels. Each panel passes its own
// `options` ({ value, label }) and owns the comparator the value maps to.
export default function SortSelect({ value, onChange, options, className = '' }) {
  return (
    <label className={`relative shrink-0 ${className}`}>
      <span className="sr-only">Sırala</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none box-border bg-bg border border-line rounded-full pl-4 pr-9 py-2 text-ink outline-none focus:border-gold cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  )
}
