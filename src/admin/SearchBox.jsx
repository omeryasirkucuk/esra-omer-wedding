// Reusable name-search input for the admin panels. Controlled by the parent,
// with a leading magnifier and a clear button that appears once there's text.
export default function SearchBox({ value, onChange, placeholder = 'İsim soyisim ara' }) {
  return (
    <div className="relative mb-3">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full box-border bg-bg border border-line rounded-full pl-9 pr-9 py-2 text-ink outline-none focus:border-gold"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Temizle"
          title="Temizle"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-rose transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
