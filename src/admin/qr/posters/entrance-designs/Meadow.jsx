// Entrance design 4 — "Çiçek Tarlası". A painterly meadow: poplars on the
// horizon, a daisy-flecked field, and the couple holding hands at centre, with
// the welcome copy floating in the open sky above. QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Tree, Cloud } from '../scenery'
import coupleArt from '../assets/couple-bust.png'

const C = {
  ink: '#33485a',
  primary: '#3f5871',
  gold: '#bda263',
  muted: '#5f7382',
  meadow: '#8fa86a',
  meadowFront: '#7d9a5b',
  gown: '#f5f0e6',
  gownShade: '#ddd6c5',
  suit: '#37424f',
  skin: '#e6bd97',
  hair: '#4a3a2c',
}

const ROUGH = 'url(#wc-rough)'

function MeadowScene({ w, h }) {
  const horizon = h * 0.54
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <linearGradient id="meadowG" x1="0" y1={horizon} x2="0" y2={h} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.meadow} />
          <stop offset="1" stopColor={C.meadowFront} />
        </linearGradient>
      </defs>
      <path d={`M0 ${horizon} Q${w * 0.5} ${horizon - 18} ${w} ${horizon} L${w} ${h} L0 ${h} Z`} fill="url(#meadowG)" filter="url(#wc-bleed)" />
    </svg>
  )
}

// Non-stretched overlay (trees, couple, daisies) in real coordinates.
function MeadowDetail({ w, h }) {
  const horizon = h * 0.54
  const daisies = []
  let seed = 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 46; i++) {
    const dx = rnd() * w
    const dy = horizon + 30 + rnd() * (h - horizon - 40)
    const r = 2 + rnd() * 2
    daisies.push(<g key={i} transform={`translate(${dx} ${dy})`}>
      <circle r={r} fill="#f6f1e6" filter={ROUGH} />
      <circle r={r * 0.4} fill={C.gold} opacity="0.8" />
    </g>)
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <Cloud x={w * 0.24} y={h * 0.16} s={1} opacity={0.9} />
      <Cloud x={w * 0.74} y={h * 0.24} s={0.8} opacity={0.8} />
      {/* tree line at the horizon (kept low so the sky stays clear for text) */}
      <Tree x={w * 0.1} y={horizon + 8} s={0.6} kind="poplar" />
      <Tree x={w * 0.24} y={horizon + 10} s={0.74} kind="poplar" fill="#7c976a" dark="#5f7a54" />
      <Tree x={w * 0.86} y={horizon + 8} s={0.64} kind="poplar" />
      <Tree x={w * 0.68} y={horizon + 14} s={0.62} kind="round" />
      <Tree x={w * 0.93} y={horizon + 14} s={0.54} kind="round" fill="#7c976a" dark="#5f7a54" />
      {daisies}
      {/* The couple illustration drops in here (centre foreground). */}
    </svg>
  )
}

const Meadow = forwardRef(function Meadow({ welcome, names, dateText, orientation = 'portrait', thumb = false }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 26, name: 116, date: 23, gap: 20, rule: 200, top: 56 }
    : { welcome: 26, name: 100, date: 22, gap: 18, rule: 200, top: 72 }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        minHeight: dims.minHeight,
        boxSizing: 'border-box',
        background: 'linear-gradient(#cfe1e8 0%, #d9e6df 38%, #e9eedd 54%)',
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <WatercolorDefs thumb={thumb} />
      <MeadowScene w={dims.width} h={dims.minHeight} />
      <MeadowDetail w={dims.width} h={dims.minHeight} />

      {/* The couple, standing in the field. */}
      <img
        src={coupleArt}
        alt=""
        style={{ position: 'absolute', left: '50%', bottom: landscape ? '11%' : '8%', transform: 'translateX(-50%)', width: landscape ? '30%' : '45%' }}
      />

      {/* Welcome copy in the sky. */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: t.gap,
          padding: `${t.top}px 70px 0`,
        }}
      >
        <div className="font-sans" style={{ fontSize: t.welcome, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, whiteSpace: 'nowrap' }}>
          {welcome}
        </div>
        <div className="font-script" style={{ fontSize: t.name, lineHeight: 1.05, color: C.primary, whiteSpace: 'nowrap' }}>
          {names}
        </div>
        <div style={{ width: t.rule, height: 1, background: C.gold, opacity: 0.6 }} />
        <div className="font-sans" style={{ fontSize: t.date, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted }}>
          {dateText}
        </div>
      </div>

      {!thumb && <PaperGrain />}
    </div>
  )
})

export default Meadow
