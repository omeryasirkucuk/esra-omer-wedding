// Entrance design 1 — "Kır Çiçekleri". A watercolor wildflower cascade pours
// down the right edge (the detail the couple loved); the welcome copy sits to
// the left on warm ivory. QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Stem, Leaf, Daisy, Poppy, Floret, Lavender, Wheat, Bud, BOTANICAL as B } from '../botanicals'

const C = { ivory: '#fbf7ee', ink: '#2f3e4d', primary: '#3f5871', gold: '#c2a25c', muted: '#6f7d89' }

// Keep the name on two calligraphy lines that break only at the last space, so
// "Esra & Ömer" reads "Esra &" / "Ömer" rather than wrapping mid-phrase.
function twoLineName(names) {
  const parts = String(names).trim().split(/\s+/)
  if (parts.length < 2) return names
  return parts.slice(0, -1).join(' ') + ' ' + parts[parts.length - 1]
}

// A eucalyptus-style frond — soft rounded leaves alternating up a gentle stem,
// for lush greenery behind the blooms.
function Frond({ x, y, s = 1, rot = 0, len = 6, fill = B.leaf }) {
  const leaves = []
  for (let i = 0; i < len; i++) {
    const yy = -i * 15 - 6
    const left = i % 2 === 0
    leaves.push(<Leaf key={i} x={left ? -3 : 3} y={yy} s={0.9} rot={left ? -52 : 52} fill={fill} opacity={0.7} />)
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      <path d={`M0 0 Q-4 ${-len * 7.5} 0 ${-len * 15}`} fill="none" stroke={B.stem} strokeWidth="1.1" opacity="0.5" />
      {leaves}
    </g>
  )
}

// The full-height bouquet, authored in a 240×900 space and scaled into the right
// strip so blooms run the whole height and bleed off the right edge. Drawn back
// to front: greenery → tall grasses → the showy blooms → trailing flowers.
function Cascade() {
  return (
    <svg viewBox="0 0 240 900" preserveAspectRatio="xMaxYMid meet" style={{ width: '100%', height: '100%' }} aria-hidden="true">
      {/* Greenery fronds, spanning the full height for fullness. */}
      <Frond x={150} y={250} s={1.25} rot={-12} len={9} />
      <Frond x={205} y={330} s={1.1} rot={12} len={8} />
      <Frond x={120} y={560} s={1.15} rot={-16} len={9} />
      <Frond x={215} y={690} s={1.05} rot={14} len={7} />
      <Frond x={170} y={880} s={1.2} rot={-4} len={8} />
      <Frond x={235} y={520} s={0.95} rot={22} len={7} />

      {/* Tall airy grasses and spires throughout. */}
      <Wheat x={150} y={120} s={1.25} rot={-7} />
      <Wheat x={210} y={250} s={1.15} rot={8} />
      <Wheat x={118} y={430} s={1.2} rot={-9} />
      <Wheat x={224} y={560} s={1.1} rot={10} />
      <Wheat x={150} y={760} s={1.2} rot={-5} />
      <Lavender x={185} y={150} s={1.35} rot={9} color={B.lavender} />
      <Lavender x={120} y={300} s={1.3} rot={-12} color={B.lavenderDeep} />
      <Lavender x={222} y={430} s={1.3} rot={12} color={B.lavender} />
      <Lavender x={108} y={650} s={1.25} rot={-14} color={B.lavenderDeep} />
      <Lavender x={195} y={820} s={1.3} rot={10} color={B.lavender} />

      {/* The showy blooms, distributed top→bottom and bleeding right. */}
      <Daisy x={210} y={170} s={1.7} rot={12} />
      <Floret x={150} y={210} s={1.6} rot={0} fill={B.blue} />
      <Poppy x={196} y={300} s={2.3} rot={8} fill={B.poppy} />
      <Daisy x={140} y={350} s={1.9} rot={-10} />
      <Floret x={224} y={380} s={1.7} rot={0} fill={B.rose} />
      <Poppy x={150} y={460} s={2.7} rot={4} fill={B.poppyDeep} />
      <Daisy x={216} y={490} s={1.8} rot={14} />
      <Floret x={120} y={500} s={1.6} rot={20} fill={B.blue} />
      <Poppy x={195} y={570} s={2.3} rot={-8} fill={B.poppy} />
      <Daisy x={138} y={600} s={1.8} rot={8} />
      <Floret x={228} y={630} s={1.7} rot={0} fill={B.rose} />
      <Poppy x={160} y={690} s={2.2} rot={12} fill={B.poppyDeep} />
      <Daisy x={210} y={720} s={1.7} rot={-12} />
      <Floret x={132} y={740} s={1.6} rot={0} fill={B.blue} />
      <Daisy x={186} y={820} s={1.9} rot={10} />
      <Poppy x={224} y={830} s={1.9} rot={16} fill={B.poppy} />
      <Floret x={150} y={870} s={1.5} rot={0} fill={B.rose} />
      <Bud x={232} y={250} s={1.4} rot={18} fill={B.rose} />
      <Bud x={120} y={420} s={1.4} rot={-18} fill={B.lavender} />
      <Bud x={236} y={720} s={1.3} rot={20} fill={B.rose} />
    </svg>
  )
}

const Wildflowers = forwardRef(function Wildflowers({ welcome, names, dateText, orientation = 'portrait', thumb = false }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'

  // The bouquet strip hugs the right edge; the text column takes the rest.
  const stripW = landscape ? '38%' : '42%'
  const t = landscape
    ? { pad: '0 0 0 64px', welcome: 31, name: 112, date: 26, gap: 30, rule: 250, track: '0.3em' }
    : { pad: '0 0 0 54px', welcome: 26, name: 114, date: 22, gap: 28, rule: 196, track: '0.26em' }

  // Landscape has the width for the full name on one line; portrait breaks it
  // at the last space ("Esra &" / "Ömer").
  const nameText = landscape ? names : twoLineName(names)

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        minHeight: dims.minHeight,
        boxSizing: 'border-box',
        background: C.ivory,
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <WatercolorDefs thumb={thumb} />

      {/* Bouquet cascade down the right edge. */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: stripW }}>
        <Cascade />
      </div>

      {/* Welcome copy, left-aligned and vertically centred. */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: dims.minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          textAlign: 'left',
          gap: t.gap,
          padding: t.pad,
          width: `calc(100% - ${stripW})`,
        }}
      >
        <div
          className="font-sans"
          style={{ fontSize: t.welcome, fontWeight: 500, letterSpacing: t.track, textTransform: 'uppercase', color: C.gold, whiteSpace: 'nowrap' }}
        >
          {welcome}
        </div>
        <div
          className="font-script"
          style={{ fontSize: t.name, lineHeight: 1.02, color: C.primary, margin: '-10px 0', whiteSpace: landscape ? 'nowrap' : 'normal' }}
        >
          {nameText}
        </div>
        <div style={{ width: t.rule, height: 1, background: C.gold, opacity: 0.7 }} />
        <div
          className="font-sans"
          style={{ fontSize: t.date, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted }}
        >
          {dateText}
        </div>
      </div>

      {!thumb && <PaperGrain />}
    </div>
  )
})

export default Wildflowers
