// Entrance design 5 — "Bulut Tarlası". A soft sky filled with big billowing
// clouds, the couple running hand in hand along a grassy rise, a few flowers in
// the corner, and the welcome copy in the open sky. QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Cloud } from '../scenery'
import { Stem, Daisy, Floret, Lavender, Leaf, BOTANICAL as B } from '../botanicals'
import coupleArt from '../assets/couple-bust.png'

const C = {
  ink: '#3a5160',
  primary: '#3f5871',
  gold: '#bda263',
  muted: '#5f7382',
  hill: '#8aa368',
  hillFront: '#789059',
  gown: '#f6f1e6',
  gownShade: '#ded7c6',
  suit: '#3a4654',
  skin: '#e6bd97',
  hair: '#4a3a2c',
}

function SkyScene({ w, h }) {
  const hill = h * 0.83
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <linearGradient id="hillG" x1="0" y1={hill} x2="0" y2={h} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.hill} />
          <stop offset="1" stopColor={C.hillFront} />
        </linearGradient>
      </defs>
      <path d={`M0 ${hill + 8} Q${w * 0.4} ${hill - 22} ${w} ${hill + 2} L${w} ${h} L0 ${h} Z`} fill="url(#hillG)" filter="url(#wc-bleed)" />
    </svg>
  )
}

function CloudDetail({ w, h }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      {/* big billowing cloud bank across the middle */}
      <Cloud x={w * 0.32} y={h * 0.56} s={3} fill="#f7f2e8" opacity={0.96} />
      <Cloud x={w * 0.72} y={h * 0.62} s={2.6} fill="#f3eee2" opacity={0.92} />
      <Cloud x={w * 0.54} y={h * 0.5} s={2.1} fill="#fbf8f0" opacity={0.9} />
      {/* small high clouds */}
      <Cloud x={w * 0.8} y={h * 0.2} s={0.7} fill="#fbf8f0" opacity={0.8} />
      {/* The couple illustration drops in here, on the rise. */}
      {/* corner flowers, bottom-left */}
      <g transform={`translate(${w * 0.06} ${h})`}>
        <Stem d="M30 -4 Q14 -60 24 -120" width={1.6} />
        <Stem d="M30 -4 Q44 -50 40 -96" />
        <Leaf x={26} y={-60} s={1.1} rot={-24} />
        <Leaf x={40} y={-44} s={1} rot={150} />
        <Daisy x={24} y={-122} s={1.3} rot={8} />
        <Floret x={42} y={-98} s={1.3} rot={0} fill={B.rose} />
        <Lavender x={14} y={-70} s={1.1} rot={-10} color={B.lavender} />
        <Daisy x={48} y={-60} s={1.1} rot={-12} />
      </g>
    </svg>
  )
}

const Clouds = forwardRef(function Clouds({ welcome, names, dateText, orientation = 'portrait', thumb = false, bg }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 26, name: 116, date: 23, gap: 20, rule: 200, top: 50 }
    : { welcome: 26, name: 102, date: 22, gap: 18, rule: 200, top: 70 }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        minHeight: dims.minHeight,
        boxSizing: 'border-box',
        background: bg || 'linear-gradient(#bdd5e1 0%, #cfe0e6 40%, #e7eddf 74%)',
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <WatercolorDefs thumb={thumb} />
      <SkyScene w={dims.width} h={dims.minHeight} />
      <CloudDetail w={dims.width} h={dims.minHeight} />

      {/* The couple, on the rise. */}
      <img
        src={coupleArt}
        alt=""
        style={{ position: 'absolute', left: '52%', bottom: landscape ? '12%' : '12%', transform: 'translateX(-50%)', width: landscape ? '27%' : '36%' }}
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

export default Clouds
