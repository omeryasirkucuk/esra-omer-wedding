// Selection-mode overlay for a grid tile: a tint when selected plus the
// check circle in the top-right corner. Shared by both album galleries so
// selection looks identical everywhere.
export default function SelectCheck({ selected }) {
  return (
    <>
      {selected && <span className="absolute inset-0 bg-primary/30 pointer-events-none" />}
      <span
        className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white pointer-events-none ${
          selected ? 'bg-gold' : 'bg-black/30 border border-white/70'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </>
  )
}
