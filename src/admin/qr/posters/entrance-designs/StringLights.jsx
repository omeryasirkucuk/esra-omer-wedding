// Entrance design 6 — "Işıklar Altında". A warm evening garden: string lights
// criss-cross the top, big trees frame the sides, guests dance by a little stone
// house at the foot, and the welcome copy sits in the open middle. QR-less.
// Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Tree } from '../scenery'
import dancersArt from '../assets/dancers.png'

const C = {
  cream: '#f8f3e8',
  ink: '#3a4654',
  primary: '#3f5871',
  gold: '#bda263',
  muted: '#62707c',
  cord: '#5a5750',
  bulb: '#e9c25c',
  stone: '#dcc8a8',
  stoneLine: '#c0a980',
  roof: '#b2916a',
  door: '#7c5e44',
}

const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// Criss-crossing light strings with warm bulbs along the top.
function CrossLights({ w }) {
  const string = (x0, y0, x1, y1, sag, n, key) => {
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2 + sag
    const bulbs = []
    for (let i = 1; i < n; i++) {
      const tt = i / n
      const bx = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * mx + tt * tt * x1
      const by = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * my + tt * tt * y1
      bulbs.push(
        <g key={i}>
          <line x1={bx} y1={by} x2={bx} y2={by + 8} stroke={C.cord} strokeWidth="0.9" />
          <circle cx={bx} cy={by + 11} r="4.4" fill={C.bulb} filter={ROUGH} style={mult} />
        </g>,
      )
    }
    return (
      <g key={key}>
        <path d={`M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`} fill="none" stroke={C.cord} strokeWidth="1.2" filter={ROUGH} />
        {bulbs}
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${w} 170`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 170 }} aria-hidden="true">
      {string(-10, 24, w * 0.62, 70, 26, 10, 'a')}
      {string(w * 0.38, 70, w + 10, 22, 26, 10, 'b')}
      {string(w * 0.1, 60, w * 0.9, 60, 40, 12, 'c')}
    </svg>
  )
}

function Scene({ w, h }) {
  const ground = h * 0.94
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      {/* framing trees */}
      <Tree x={w * 0.13} y={ground} s={1.9} kind="round" fill="#8fa86a" dark="#6f8a55" />
      <Tree x={w * 0.9} y={ground} s={1} kind="poplar" fill="#7f9a64" dark="#5f7a4c" />
      <Tree x={w * 0.97} y={ground} s={0.7} kind="poplar" />
      {/* The dancing-guests illustration drops in here (centre foot). */}
      {/* candle table */}
      <g style={mult} filter={ROUGH}>
        <rect x={w * 0.63 - 18} y={ground - 16} width="36" height="16" fill="#e3cba6" />
        <rect x={w * 0.63 - 3} y={ground - 30} width="6" height="14" fill="#e7c79f" />
        <path d={`M${w * 0.63} ${ground - 30} q-4 -8 0 -12 q4 4 0 12`} fill="#e0a85a" />
      </g>
    </svg>
  )
}

const StringLights = forwardRef(function StringLights({ welcome, names, dateText, orientation = 'portrait', thumb = false, bg }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 27, name: 120, date: 24, gap: 20, rule: 210, top: 0.16 }
    : { welcome: 28, name: 110, date: 24, gap: 24, rule: 220, top: 0.32 }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        minHeight: dims.minHeight,
        boxSizing: 'border-box',
        background: bg || C.cream,
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <WatercolorDefs thumb={thumb} />
      <CrossLights w={dims.width} />
      <Scene w={dims.width} h={dims.minHeight} />

      {/* Dancing guests, centre foot. */}
      <img
        src={dancersArt}
        alt=""
        style={{ position: 'absolute', left: '50%', bottom: landscape ? '5%' : '4%', transform: 'translateX(-50%)', width: landscape ? '25%' : '44%' }}
      />

      {/* Welcome copy in the open middle. */}
      <div
        style={{
          position: 'absolute',
          top: dims.minHeight * t.top,
          left: 0,
          right: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: t.gap,
          padding: '0 70px',
        }}
      >
        <div className="font-sans" style={{ fontSize: t.welcome, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, whiteSpace: 'nowrap' }}>
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

export default StringLights
