// A small totals chip used in panel summary rows (count/value at a glance).
export default function Stat({ label, value, highlight, hint }) {
  return (
    <div
      className={`card-soft px-4 py-2 text-center flex-1 min-w-[5.5rem] ${
        highlight ? 'border-gold' : ''
      }`}
    >
      <p className="label">{label}</p>
      <p
        className={`font-display text-2xl lining-nums tabular-nums ${
          highlight ? 'text-gold' : 'text-primary'
        }`}
      >
        {value}
      </p>
      {hint && <p className="label text-[0.55rem] mt-0.5">{hint}</p>}
    </div>
  )
}
