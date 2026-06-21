// Shared festive decorations for the garden-party entrance designs (Garden Feast
// and its illustration-free Champagne Feast sibling): the string-light garland
// that swags across the top and the slender wildflower spray that climbs a side
// edge. Kept here so both designs draw the exact same garland/sprays.
import { Stem, Daisy, Poppy, Lavender, Wheat, Floret, Leaf, BOTANICAL as B } from '../botanicals'

const LIGHTS = { cord: '#a9bac9', warm: '#e6c25c', cool: '#8fb0c8' }
const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// String-light garland — two swags with alternating warm/blue bulbs.
export function Bunting({ w }) {
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
          <line x1={bx} y1={by} x2={bx} y2={by + 9} stroke={LIGHTS.cord} strokeWidth="1" />
          <circle cx={bx} cy={by + 12} r="4.6" fill={i % 2 ? LIGHTS.warm : LIGHTS.cool} filter={ROUGH} style={mult} />
        </g>,
      )
    }
    return (
      <g>
        <path d={d} fill="none" stroke={LIGHTS.cord} strokeWidth="1.4" filter={ROUGH} />
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
export function SideSpray({ flip = false }) {
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
