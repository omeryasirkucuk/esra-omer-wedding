import { useEffect, useState } from 'react'

function diff(targetISO) {
  const ms = Math.max(0, new Date(targetISO).getTime() - Date.now())
  const s = Math.floor(ms / 1000)
  return {
    gun: Math.floor(s / 86400),
    saat: Math.floor((s % 86400) / 3600),
    dk: Math.floor((s % 3600) / 60),
    sn: s % 60,
  }
}

// Elegant countdown: numerals separated by thin gold rules, no boxes.
export default function Countdown({ targetISO }) {
  const [t, setT] = useState(() => diff(targetISO))
  useEffect(() => {
    const id = setInterval(() => setT(diff(targetISO)), 1000)
    return () => clearInterval(id)
  }, [targetISO])

  const units = [
    ['gün', t.gun],
    ['saat', t.saat],
    ['dk', t.dk],
    ['sn', t.sn],
  ]
  return (
    <div className="flex justify-center items-start">
      {units.map(([label, value], i) => (
        <div key={label} className="flex items-start">
          <div className="px-3 text-center">
            <div className="font-display font-medium text-primary text-3xl leading-none tabular-nums">
              {String(value).padStart(2, '0')}
            </div>
            <div className="label mt-1" style={{ fontSize: '0.5rem' }}>
              {label}
            </div>
          </div>
          {i < units.length - 1 && <div className="w-px h-8 bg-[#cdb06a66] mt-1" />}
        </div>
      ))}
    </div>
  )
}
