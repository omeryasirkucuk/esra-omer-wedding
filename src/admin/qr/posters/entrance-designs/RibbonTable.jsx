// Entrance design 2 — "Yeşil Kurdele". A hand-drawn green ribbon frame tied with
// a bow at the top, a little dinner-table vignette tucked into the bottom-left
// corner, and the welcome copy centred inside. Ink-line style (the wc-rough
// filter gives the strokes a hand-drawn wobble). QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'

const C = {
  cream: '#f7f1e4',
  ink: '#3a4654',
  green: '#4f7a4a',
  greenDeep: '#3c6238',
  blue: '#6b82a8',
  cloth: '#eed7c1',
  clothShade: '#e3c3a4',
  pink: '#d690a8',
  pinkDeep: '#c2738f',
  candle: '#e7c79f',
  flame: '#e0a85a',
  muted: '#6f7d89',
}

const ROUGH = 'url(#wc-rough)'

function framePath(w, h) {
  const m = 46
  const r = 30
  return `M${m + r} ${m} L${w - m - r} ${m} Q${w - m} ${m} ${w - m} ${m + r} L${w - m} ${h - m - r} Q${w - m} ${h - m} ${w - m - r} ${h - m} L${m + r} ${h - m} Q${m} ${h - m} ${m} ${h - m - r} L${m} ${m + r} Q${m} ${m} ${m + r} ${m} Z`
}

// The ribbon bow tied at the top-centre of the frame, with long tails draping
// down the way the reference ribbon does.
function Bow({ cx, cy, s = 1.35 }) {
  const st = { strokeLinecap: 'round', strokeLinejoin: 'round', mixBlendMode: 'multiply' }
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} fill="none" stroke={C.green} strokeWidth="2" filter={ROUGH} style={st}>
      {/* tails trailing down and curling */}
      <path d="M-3 5 C-12 34 -30 40 -36 66 C-39 80 -29 84 -24 72" />
      <path d="M3 5 C12 34 30 40 36 66 C39 80 29 84 24 72" />
      {/* loops */}
      <path d="M-2 3 C-30 -20 -62 -12 -57 8 C-53 25 -22 19 -2 4 Z" />
      <path d="M2 3 C30 -20 62 -12 57 8 C53 25 22 19 2 4 Z" />
      {/* inner loop creases */}
      <path d="M-6 4 C-22 -6 -40 -4 -46 6" strokeWidth="1.3" opacity="0.6" />
      <path d="M6 4 C22 -6 40 -4 46 6" strokeWidth="1.3" opacity="0.6" />
      {/* knot */}
      <path d="M-5 -2 C-2 7 2 7 5 -2 C2 -8 -2 -8 -5 -2 Z" fill={C.green} stroke="none" />
    </g>
  )
}

// A small dinner-table scene for the bottom-left corner: blue bentwood chairs, a
// draped peach cloth, pink centrepieces, candles and glasses, with a flowering
// bush alongside.
function TableScene() {
  const stroke = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', filter: ROUGH }
  const mult = { mixBlendMode: 'multiply' }
  return (
    <svg viewBox="0 0 340 250" width="340" height="250" aria-hidden="true">
      {/* chairs behind the table */}
      <g stroke={C.blue} strokeWidth="2.1" {...stroke} style={mult}>
        <path d="M70 120 q-6 -34 4 -54 q10 -16 22 -2 q8 12 4 50" />
        <path d="M78 70 q14 -8 24 0 M76 86 q16 -8 28 0 M74 102 q18 -8 30 0" />
        <path d="M150 116 q-4 -34 6 -54 q10 -16 22 -2 q8 12 4 48" />
        <path d="M158 70 q14 -8 24 0 M156 86 q16 -8 28 0" />
      </g>
      {/* table + draped cloth */}
      <path d="M40 150 L300 150 L286 232 Q170 246 54 232 Z" fill={C.cloth} stroke={C.clothShade} strokeWidth="1.6" {...stroke} style={mult} />
      <path d="M40 150 L300 150" stroke={C.clothShade} strokeWidth="2" {...stroke} style={mult} />
      <g stroke={C.clothShade} strokeWidth="1.3" {...stroke} style={mult}>
        <path d="M96 152 q4 40 -2 78 M170 153 q0 42 0 80 M244 152 q-4 40 2 78" />
      </g>
      {/* plates + glasses on the table */}
      <g stroke={C.blue} strokeWidth="1.5" {...stroke} style={mult}>
        <ellipse cx="100" cy="158" rx="22" ry="7" />
        <ellipse cx="240" cy="158" rx="22" ry="7" />
        <path d="M132 150 q-3 -16 3 -22 M138 150 q3 -16 -3 -22" />
        <path d="M210 150 q-3 -16 3 -22 M216 150 q3 -16 -3 -22" />
      </g>
      <path d="M133 128 q5 6 11 0" fill={C.pink} stroke="none" opacity="0.5" style={mult} />
      <path d="M211 128 q5 6 11 0" fill={C.pink} stroke="none" opacity="0.5" style={mult} />
      {/* centrepiece flowers + candles */}
      <g style={mult}>
        {[150, 174, 162].map((x, i) => (
          <g key={i} transform={`translate(${x} ${132 - i * 4})`}>
            <circle r="6.5" fill={i % 2 ? C.pink : C.pinkDeep} filter={ROUGH} opacity="0.9" />
            <circle r="2.4" fill={C.candle} />
          </g>
        ))}
        <path d="M150 138 q-2 18 0 16 M168 138 q2 18 0 14" stroke={C.green} strokeWidth="1.6" fill="none" filter={ROUGH} />
        {/* candle */}
        <rect x="196" y="108" width="6" height="40" fill={C.candle} filter={ROUGH} />
        <path d="M199 108 q-4 -8 0 -12 q4 4 0 12" fill={C.flame} filter={ROUGH} />
      </g>
      {/* flowering bush to the right */}
      <g style={mult}>
        <path d="M300 240 q-10 -40 6 -64 M312 240 q6 -36 0 -58 M324 240 q12 -34 2 -52" stroke={C.green} strokeWidth="2" fill="none" filter={ROUGH} />
        {[[304, 176], [318, 184], [330, 192], [300, 200], [322, 206], [312, 168]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="5.5" fill={i % 2 ? C.pink : C.pinkDeep} filter={ROUGH} opacity="0.88" />
            <circle r="1.8" fill={C.candle} opacity="0.8" />
          </g>
        ))}
      </g>
    </svg>
  )
}

const RibbonTable = forwardRef(function RibbonTable({ welcome, names, dateText, orientation = 'portrait', thumb = false, bg }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 26, name: 112, date: 23, gap: 22, rule: 200, padB: 60, scene: 1.05 }
    : { welcome: 27, name: 104, date: 23, gap: 24, rule: 210, padB: 150, scene: 1.15 }

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

      {/* Ribbon frame (stretches to the poster) + bow on top. */}
      <svg
        viewBox={`0 0 ${dims.width} ${dims.minHeight}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <path d={framePath(dims.width, dims.minHeight)} fill="none" stroke={C.green} strokeWidth="2.6" filter={ROUGH} style={{ mixBlendMode: 'multiply' }} />
      </svg>
      <svg viewBox={`0 0 ${dims.width} ${dims.minHeight}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <Bow cx={dims.width / 2} cy={46} />
      </svg>

      {/* Dinner-table vignette, bottom-left. */}
      <div style={{ position: 'absolute', left: 40, bottom: 36, transformOrigin: 'bottom left', transform: `scale(${t.scene})` }}>
        <TableScene />
      </div>

      {/* Centred welcome copy, lifted above the vignette. */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: dims.minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: t.gap,
          padding: `0 70px ${t.padB}px`,
        }}
      >
        <div className="font-sans" style={{ fontSize: t.welcome, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.greenDeep, whiteSpace: 'nowrap' }}>
          {welcome}
        </div>
        <div className="font-script" style={{ fontSize: t.name, lineHeight: 1.05, color: C.greenDeep }}>
          {names}
        </div>
        <div style={{ width: t.rule, height: 1, background: C.green, opacity: 0.55 }} />
        <div className="font-sans" style={{ fontSize: t.date, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted }}>
          {dateText}
        </div>
      </div>

      {!thumb && <PaperGrain />}
    </div>
  )
})

export default RibbonTable
