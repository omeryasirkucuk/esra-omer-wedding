// Entrance design 3 — "Bahçe Şöleni". A festive garden party: a string-light
// garland swags across the top, wildflower stems rise up the sides, and a
// champagne tower with dancing guests fills the foot. The welcome copy sits in
// the open upper-middle. QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Stem, Daisy, Poppy, Lavender, Wheat, Floret, Leaf, BOTANICAL as B } from '../botanicals'
import dancersArt from '../assets/dancers.png'

const C = {
  cream: '#f7f1e4',
  ink: '#324252',
  primary: '#3f5871',
  gold: '#c2a25c',
  muted: '#6f7d89',
  light: '#e6c25c',
  lightBlue: '#8fb0c8',
  cord: '#a9bac9',
  champ: '#e7a9bf',
  rim: '#cbb48a',
  bottle: '#5e7a4f',
  wine: '#9a3f4a',
}

const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// String-light garland — two swags with alternating warm/blue bulbs.
function Bunting({ w }) {
  const swag = (y0, sag, n, lift) => {
    const x0 = 30
    const x1 = w - 30
    const mx = (x0 + x1) / 2
    const d = `M${x0} ${y0} Q${mx} ${y0 + sag} ${x1} ${y0 - lift}`
    const bulbs = []
    for (let i = 1; i < n; i++) {
      const tt = i / n
      // point on the quadratic bezier
      const bx = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * mx + tt * tt * x1
      const by = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * (y0 + sag) + tt * tt * (y0 - lift)
      bulbs.push(
        <g key={i}>
          <line x1={bx} y1={by} x2={bx} y2={by + 9} stroke={C.cord} strokeWidth="1" />
          <circle cx={bx} cy={by + 12} r="4.6" fill={i % 2 ? C.light : C.lightBlue} filter={ROUGH} style={mult} />
        </g>,
      )
    }
    return (
      <g>
        <path d={d} fill="none" stroke={C.cord} strokeWidth="1.4" filter={ROUGH} />
        {bulbs}
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${w} 150`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 150 }} aria-hidden="true">
      {swag(34, 70, 13, 6)}
      {swag(70, 64, 11, -10)}
    </svg>
  )
}

// A slender wildflower stem rising up a side edge.
function SideSpray({ flip = false }) {
  return (
    <svg viewBox="0 0 120 520" width="120" height="520" style={{ transform: flip ? 'scaleX(-1)' : 'none' }} aria-hidden="true">
      <Stem d="M70 516 Q40 300 54 60" width={1.6} />
      <Stem d="M70 516 Q92 360 86 150" />
      <Leaf x={58} y={300} s={1.2} rot={-26} />
      <Leaf x={80} y={250} s={1.2} rot={150} />
      <Leaf x={54} y={160} s={1.1} rot={-22} />
      <Lavender x={52} y={70} s={1.25} rot={-8} color={B.lavender} />
      <Wheat x={88} y={150} s={1.1} rot={9} />
      <Daisy x={66} y={210} s={1.4} rot={10} />
      <Poppy x={84} y={300} s={1.7} rot={-8} fill={B.poppy} />
      <Daisy x={56} y={380} s={1.3} rot={-12} />
      <Floret x={86} y={420} s={1.4} rot={0} fill={B.rose} />
      <Lavender x={70} y={470} s={1.1} rot={6} color={B.lavenderDeep} />
    </svg>
  )
}

const GardenFeast = forwardRef(function GardenFeast({ welcome, names, dateText, orientation = 'portrait', thumb = false }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 27, name: 118, date: 24, gap: 18, rule: 210, top: 130 }
    : { welcome: 28, name: 100, date: 24, gap: 22, rule: 220, top: 285 }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        minHeight: dims.minHeight,
        boxSizing: 'border-box',
        background: C.cream,
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <WatercolorDefs thumb={thumb} />

      <Bunting w={dims.width} />

      {/* Side wildflower sprays, bottom corners. */}
      <div style={{ position: 'absolute', left: -6, bottom: 70 }}>
        <SideSpray />
      </div>
      <div style={{ position: 'absolute', right: -6, bottom: 70 }}>
        <SideSpray flip />
      </div>

      {/* Dancing guests, centre foot. */}
      <img
        src={dancersArt}
        alt=""
        style={{ position: 'absolute', left: '50%', bottom: '3%', transform: 'translateX(-50%)', width: landscape ? '31%' : '52%' }}
      />

      {/* Welcome copy, upper-middle. */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: t.gap,
          padding: `${t.top}px 80px 0`,
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

export default GardenFeast
