// Shared painterly scene primitives for the illustrated entrance designs
// (Garden Feast, Meadow, Clouds, String Lights): little people, trees and
// clouds, drawn flat with soft multiply fills and the wc-rough edge wobble so
// they sit in the same hand-painted world as the floral designs.

const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// A small celebrating figure. Origin is at the feet centre; the figure grows
// upward to ~60 units. `kind` is 'dress' or 'suit'; `arms` is 'up' | 'out'.
export function Person({ x = 0, y = 0, s = 1, skin = '#e6bd97', hair = '#5b4636', outfit = '#c2738f', kind = 'dress', arms = 'up' }) {
  const armPath =
    arms === 'up'
      ? ['M-5 -42 Q-15 -54 -13 -64', 'M5 -42 Q15 -54 13 -64']
      : ['M-5 -42 Q-16 -44 -22 -38', 'M5 -42 Q16 -44 22 -38']
  const hands = arms === 'up' ? [[-13, -64], [13, -64]] : [[-22, -38], [22, -38]]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={mult}>
      {/* legs (suit only; a dress hides them) */}
      {kind === 'suit' && (
        <g stroke="#3a4654" strokeWidth="4.5" strokeLinecap="round" filter={ROUGH}>
          <path d="M-3 0 L-3 -24" />
          <path d="M3 0 L3 -24" />
        </g>
      )}
      {/* body */}
      {kind === 'dress' ? (
        <path d="M-5 -45 L5 -45 L14 0 L-14 0 Z" fill={outfit} filter={ROUGH} />
      ) : (
        <path d="M-7 -45 L7 -45 L6 -24 L-6 -24 Z" fill={outfit} filter={ROUGH} />
      )}
      {/* arms */}
      <g fill="none" stroke={outfit} strokeWidth="4.2" strokeLinecap="round" filter={ROUGH}>
        <path d={armPath[0]} />
        <path d={armPath[1]} />
      </g>
      {hands.map(([hx, hy], i) => (
        <circle key={i} cx={hx} cy={hy} r="2.6" fill={skin} filter={ROUGH} />
      ))}
      {/* head + hair */}
      <circle cx="0" cy="-52" r="6.4" fill={skin} filter={ROUGH} />
      <path d="M-6.6 -52 Q-7 -62 0 -62 Q7 -62 6.6 -52 Q4 -57 0 -57 Q-4 -57 -6.6 -52 Z" fill={hair} filter={ROUGH} />
    </g>
  )
}

// A tree. `kind` 'poplar' is a tall teardrop; 'round' is a broad canopy. Drawn
// as layered green blobs over a trunk.
export function Tree({ x = 0, y = 0, s = 1, kind = 'round', fill = '#8aa178', dark = '#6f8763' }) {
  const trunk = <path d="M-4 0 Q-2 -30 0 -54 Q2 -30 4 0 Z" fill="#9c7e58" filter={ROUGH} style={mult} />
  if (kind === 'poplar') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M-3 0 Q-1 -60 0 -120 Q1 -60 3 0 Z" fill="#9c7e58" filter={ROUGH} style={mult} />
        <g style={mult} filter={ROUGH}>
          <ellipse cx="0" cy="-110" rx="20" ry="34" fill={fill} />
          <ellipse cx="0" cy="-72" rx="26" ry="40" fill={dark} opacity="0.85" />
          <ellipse cx="0" cy="-40" rx="22" ry="34" fill={fill} />
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {trunk}
      <g style={mult} filter={ROUGH}>
        <circle cx="-22" cy="-58" r="26" fill={dark} opacity="0.9" />
        <circle cx="20" cy="-56" r="28" fill={fill} />
        <circle cx="0" cy="-74" r="30" fill={fill} />
        <circle cx="-4" cy="-50" r="26" fill={dark} opacity="0.8" />
      </g>
    </g>
  )
}

// A soft cloud — overlapping rounded lobes.
export function Cloud({ x = 0, y = 0, s = 1, fill = '#fbf8f0', opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={opacity} filter="url(#wc-bleed)">
      <ellipse cx="0" cy="0" rx="46" ry="26" />
      <ellipse cx="-34" cy="6" rx="26" ry="18" />
      <ellipse cx="34" cy="6" rx="30" ry="20" />
      <ellipse cx="-10" cy="-12" rx="26" ry="20" />
      <ellipse cx="18" cy="-10" rx="22" ry="18" />
    </g>
  )
}
