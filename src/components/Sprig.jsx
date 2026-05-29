// Thin gold rule with a small botanical sprig — the recurring section divider.
export default function Sprig({ width = 150, leaves = true, className = '' }) {
  return (
    <svg viewBox="0 0 160 24" width={width} height={width * 0.15} className={className} aria-hidden="true">
      <line x1="10" y1="12" x2="150" y2="12" stroke="var(--c-gold)" strokeWidth="1" />
      {leaves && (
        <g fill="none" stroke="var(--c-sage)" strokeWidth="1.2">
          <path d="M80 12 q-8 -7 -16 -5" />
          <path d="M80 12 q8 -7 16 -5" />
          <path d="M80 12 q-6 7 -13 6" />
          <path d="M80 12 q6 7 13 6" />
        </g>
      )}
      <circle cx="80" cy="12" r="2.4" fill="var(--c-rose)" />
    </svg>
  )
}
