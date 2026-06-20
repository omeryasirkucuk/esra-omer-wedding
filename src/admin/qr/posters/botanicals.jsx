// Watercolor wildflower primitives shared by the floral entrance designs
// (Wildflowers, Garden Feast). Each is a self-contained <g> placed with
// translate/scale/rotate, drawn in the site's harmonized palette so the bouquet
// reads as fine-stationery rather than a clip-art garden. Colored pigments use
// the wc-rough filter + multiply (see watercolor.jsx) for a wet, bleeding edge;
// cream daisy petals stay normal-blend (multiply would erase them on ivory).

export const BOTANICAL = {
  stem: '#8a9a7b',
  stemDeep: '#6f7f63',
  leaf: '#9aa988',
  poppy: '#b5654d',
  poppyDeep: '#9c4f3c',
  rose: '#b98ca0',
  lavender: '#9a8bb0',
  lavenderDeep: '#7f72a0',
  gold: '#c2a25c',
  wheat: '#cdb06a',
  cream: '#f3ead4',
  creamShade: '#dccfb0',
  blue: '#7e98ad',
  center: '#c8a64e',
  centerDeep: '#9c7e34',
}

const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// A curved stalk. `d` is a path in the flower's local space.
export function Stem({ d, color = BOTANICAL.stem, width = 1.6, opacity = 0.9 }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} filter={ROUGH} style={mult} />
}

// A soft, rounded leaf (almond shape) with a faint midrib.
export function Leaf({ x = 0, y = 0, s = 1, rot = 0, fill = BOTANICAL.leaf, opacity = 0.85 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} style={mult}>
      <path d="M0 0 Q9 -9 0 -22 Q-9 -9 0 0 Z" fill={fill} opacity={opacity} filter={ROUGH} />
      <path d="M0 -1 Q1 -11 0 -20" fill="none" stroke={BOTANICAL.stemDeep} strokeWidth="0.6" opacity="0.35" />
    </g>
  )
}

// A daisy / cosmos — cream petals with a gold pollen center, lifted off the
// ivory by a faint sage backing so it reads on a plain ground (on the reference
// the white blooms sit among other flowers; here they need the help).
export function Daisy({ x = 0, y = 0, s = 1, rot = 0, petal = BOTANICAL.cream }) {
  const n = 12
  const petals = Array.from({ length: n }, (_, i) => (
    <ellipse key={i} cx="0" cy="-9.5" rx="2.7" ry="6.8" fill={petal} filter={ROUGH} transform={`rotate(${(i / n) * 360})`} opacity="0.98" />
  ))
  const shade = Array.from({ length: n }, (_, i) => (
    <ellipse key={`s${i}`} cx="1" cy="-8.8" rx="2.5" ry="6.4" fill={BOTANICAL.creamShade} filter={ROUGH} transform={`rotate(${(i / n) * 360})`} opacity="0.75" style={mult} />
  ))
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      <circle r="13" fill="#c7cdbb" opacity="0.35" filter={ROUGH} style={mult} />
      {shade}
      {petals}
      <circle r="4.4" fill={BOTANICAL.center} filter={ROUGH} style={mult} />
      <circle r="2.4" fill={BOTANICAL.centerDeep} opacity="0.45" />
    </g>
  )
}

// A poppy / cosmos — rounded overlapping petals around a dark eye.
export function Poppy({ x = 0, y = 0, s = 1, rot = 0, fill = BOTANICAL.poppy }) {
  const n = 5
  const petals = Array.from({ length: n }, (_, i) => (
    <path key={i} d="M0 0 C7 -4 9 -13 0 -16 C-9 -13 -7 -4 0 0 Z" fill={fill} filter={ROUGH} transform={`rotate(${(i / n) * 360})`} opacity="0.9" style={mult} />
  ))
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      {petals}
      <circle r="3" fill={BOTANICAL.poppyDeep} filter={ROUGH} style={mult} />
      <circle r="1.5" fill="#4a3026" opacity="0.7" />
    </g>
  )
}

// A small 5-petal floret (rose / dusty-blue accents).
export function Floret({ x = 0, y = 0, s = 1, rot = 0, fill = BOTANICAL.rose }) {
  const n = 5
  const petals = Array.from({ length: n }, (_, i) => (
    <ellipse key={i} cx="0" cy="-5" rx="3.1" ry="4.4" fill={fill} filter={ROUGH} transform={`rotate(${(i / n) * 360})`} opacity="0.88" style={mult} />
  ))
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      {petals}
      <circle r="1.7" fill={BOTANICAL.gold} opacity="0.9" style={mult} />
    </g>
  )
}

// A lavender / veronica spike — a stalk strung with small buds.
export function Lavender({ x = 0, y = 0, s = 1, rot = 0, color = BOTANICAL.lavender }) {
  const buds = []
  for (let i = 0; i < 9; i++) {
    const yy = -i * 4
    const off = (i % 2 ? 1 : -1) * (2.4 - i * 0.18)
    buds.push(<circle key={i} cx={off} cy={yy} r={2.5 - i * 0.16} fill={i % 2 ? color : BOTANICAL.lavenderDeep} filter={ROUGH} opacity="0.85" style={mult} />)
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      <path d="M0 4 Q-1 -16 0 -36" fill="none" stroke={BOTANICAL.stem} strokeWidth="1.1" opacity="0.7" />
      {buds}
    </g>
  )
}

// A wheat / grass head — chevron seeds climbing a thin stalk.
export function Wheat({ x = 0, y = 0, s = 1, rot = 0, color = BOTANICAL.wheat }) {
  const seeds = []
  for (let i = 0; i < 8; i++) {
    const yy = -6 - i * 4.5
    seeds.push(
      <g key={i} transform={`translate(0 ${yy})`} style={mult}>
        <path d={`M0 0 Q-5 -1 -6 -5`} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" filter={ROUGH} opacity="0.85" />
        <path d={`M0 0 Q5 -1 6 -5`} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" filter={ROUGH} opacity="0.85" />
      </g>,
    )
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
      <path d="M0 4 Q1 -20 0 -44" fill="none" stroke={BOTANICAL.stemDeep} strokeWidth="1" opacity="0.6" />
      {seeds}
    </g>
  )
}

// A teardrop bud on a tip.
export function Bud({ x = 0, y = 0, s = 1, rot = 0, fill = BOTANICAL.rose }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} style={mult}>
      <path d="M0 0 C4 -2 4 -9 0 -12 C-4 -9 -4 -2 0 0 Z" fill={fill} filter={ROUGH} opacity="0.85" />
    </g>
  )
}
