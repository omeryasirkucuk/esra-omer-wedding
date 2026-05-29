// "Farkı Bul": a minimal working version. Two side-by-side placeholder panels;
// a few subtle marks appear only on the right panel. Tapping each mark "finds"
// it; a counter tracks progress until all are found.
import { useMemo, useState } from 'react'
import GameShell from '../GameShell.jsx'

// TODO: replace the gradient panels with two near-identical couple photos and
// position the hotspots over the real differences when photos are available.
// Coordinates are percentages within the panel.
const SPOTS = [
  { id: 1, x: 22, y: 28 },
  { id: 2, x: 68, y: 40 },
  { id: 3, x: 40, y: 72 },
  { id: 4, x: 78, y: 78 },
]

const PANEL_GRADIENT = 'linear-gradient(135deg,#eef0e6,#e6e4d4 60%,#e9ddc6)'

export default function SpotDifference() {
  const total = SPOTS.length
  const [found, setFound] = useState([])
  const done = found.length === total

  const reset = () => setFound([])

  const markFound = (id) => {
    if (found.includes(id)) return
    setFound((prev) => [...prev, id])
  }

  const decorations = useMemo(
    () =>
      // A few non-interactive floral marks shared by both panels for ambience.
      [
        { x: 50, y: 18 },
        { x: 15, y: 60 },
        { x: 85, y: 22 },
      ],
    []
  )

  return (
    <GameShell label="Foto üstünde" title="Farkı Bul">
      <p className="label text-center">
        Sağ panelde gizli {total} farkı bul · Bulunan {found.length}/{total}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5 w-full">
        {/* Left reference panel */}
        <Panel gradient={PANEL_GRADIENT}>
          {decorations.map((d, i) => (
            <Dot key={i} x={d.x} y={d.y} muted />
          ))}
        </Panel>

        {/* Right panel with the tappable differences */}
        <Panel gradient={PANEL_GRADIENT}>
          {decorations.map((d, i) => (
            <Dot key={i} x={d.x} y={d.y} muted />
          ))}
          {SPOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => markFound(s.id)}
              aria-label={found.includes(s.id) ? 'Bulundu' : 'Farkı bul'}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                border: found.includes(s.id) ? '2px solid var(--c-primary)' : '2px dashed transparent',
                background: found.includes(s.id) ? 'var(--c-primary-soft)' : 'transparent',
              }}
            >
              {found.includes(s.id) && <span className="text-white text-xs">✓</span>}
            </button>
          ))}
        </Panel>
      </div>

      {done ? (
        <div className="text-center mt-7 animate-fadeUp">
          <p className="font-display italic text-primary text-2xl">Tebrikler!</p>
          <p className="label mt-1">Tüm farkları buldun</p>
          <button type="button" onClick={reset} className="btn-lux mt-5">
            Tekrar Oyna
          </button>
        </div>
      ) : (
        <button type="button" onClick={reset} className="btn-lux mt-7">
          Sıfırla
        </button>
      )}
    </GameShell>
  )
}

function Panel({ gradient, children }) {
  return (
    <div
      className="relative aspect-[3/4] rounded-xl border border-[#e2d6b8] overflow-hidden"
      style={{ background: gradient }}
    >
      {children}
    </div>
  )
}

function Dot({ x, y, muted }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 text-rose"
      style={{ left: `${x}%`, top: `${y}%`, opacity: muted ? 0.5 : 1 }}
      aria-hidden="true"
    >
      ❀
    </span>
  )
}
