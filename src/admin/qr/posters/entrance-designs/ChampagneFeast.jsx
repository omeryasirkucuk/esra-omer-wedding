// Entrance design 7 — "Şampanya Şöleni". The illustration-free sibling of Garden
// Feast (the couple wanted the old, no-centre-figure look back as an option): the
// same string-light garland and side wildflower sprays, but instead of the dancing
// guests the foot carries a little champagne-tower-and-bottle still life. QR-less.
// Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Bunting, SideSpray } from './festive'

const C = {
  cream: '#f7f1e4',
  ink: '#324252',
  primary: '#3f5871',
  gold: '#c2a25c',
  muted: '#6f7d89',
  champ: '#e7a9bf', // blush champagne
  rim: '#cbb48a', // glass rim / stem
  glass: '#a9bac9', // clear-glass outline
  bottle: '#5e7a4f', // green bottle
  bottleCap: '#3f5638',
  label: '#f3ead4',
  wine: '#9a3f4a',
  candle: '#e7c79f',
  flame: '#e0a85a',
  grape: '#9a8bb0',
}

const ROUGH = 'url(#wc-rough)'
const mult = { mixBlendMode: 'multiply' }

// A single champagne coupe. The bottom row of the tower gets a stem + foot; the
// stacked rows above are just bowls nestled into the dimples below.
function Coupe({ foot = false }) {
  return (
    <g style={mult}>
      <path d="M-7 0 Q0 10 7 0 Z" fill={C.champ} filter={ROUGH} opacity="0.9" />
      <path d="M-8 -0.6 L8 -0.6" fill="none" stroke={C.rim} strokeWidth="1.3" filter={ROUGH} />
      {foot && (
        <>
          <path d="M0 9 L0 18" fill="none" stroke={C.rim} strokeWidth="1.1" />
          <path d="M-5 18 Q0 20 5 18" fill="none" stroke={C.rim} strokeWidth="1.1" />
        </>
      )}
    </g>
  )
}

// A champagne fountain — a pyramid of coupes with a few rising bubbles.
function ChampagneTower() {
  const row = (xs, y, foot) => xs.map((x, i) => (
    <g key={`${y}-${i}`} transform={`translate(${x} ${y})`}>
      <Coupe foot={foot} />
    </g>
  ))
  return (
    <g>
      {row([-18, 0, 18], 0, true)}
      {row([-9, 9], -13, false)}
      {row([0], -26, false)}
      <circle cx="0" cy="-35" r="1.2" fill={C.champ} opacity="0.85" />
      <circle cx="3" cy="-31" r="0.8" fill={C.champ} opacity="0.6" />
      <circle cx="-3" cy="-32" r="0.7" fill={C.champ} opacity="0.6" />
    </g>
  )
}

// A stemmed glass of red wine.
function WineGlass() {
  return (
    <g style={mult}>
      <path d="M-6 -14 Q-6 -2 0 -2 Q6 -2 6 -14 Z" fill="none" stroke={C.glass} strokeWidth="1.2" filter={ROUGH} />
      <path d="M-5 -13 Q-5 -5 0 -4 Q5 -5 5 -13 Z" fill={C.wine} opacity="0.85" filter={ROUGH} />
      <path d="M0 -2 L0 8" fill="none" stroke={C.glass} strokeWidth="1.1" />
      <path d="M-5 8 Q0 10 5 8" fill="none" stroke={C.glass} strokeWidth="1.1" />
    </g>
  )
}

// A standing green wine bottle with a cream label.
function Bottle() {
  return (
    <g style={mult} filter={ROUGH}>
      <rect x="-7" y="-24" width="14" height="24" rx="3" fill={C.bottle} />
      <rect x="-3" y="-40" width="6" height="17" fill={C.bottle} />
      <rect x="-3.6" y="-43" width="7.2" height="4" rx="1" fill={C.bottleCap} />
      <rect x="-7" y="-15" width="14" height="8" fill={C.label} opacity="0.85" />
    </g>
  )
}

// A lit taper candle.
function Candle() {
  return (
    <g style={mult}>
      <rect x="-3" y="-22" width="6" height="22" fill={C.candle} filter={ROUGH} />
      <path d="M0 -22 q-4 -8 0 -12 q4 4 0 12" fill={C.flame} filter={ROUGH} />
    </g>
  )
}

// A small grape cluster.
function Grapes() {
  const pts = [[0, 0], [-4, 2], [4, 2], [-2, 5], [2, 5], [0, 8]]
  return (
    <g style={mult}>
      {pts.map(([gx, gy], i) => (
        <circle key={i} cx={gx} cy={gy} r="2.4" fill={C.grape} filter={ROUGH} opacity="0.85" />
      ))}
    </g>
  )
}

// The celebration still life laid across the foot of the sign, in poster space.
function FootStillLife({ w, h, landscape }) {
  const tower = landscape ? { x: w * 0.17, y: h - 44, s: 1.5 } : { x: w * 0.18, y: h - 78, s: 1.7 }
  const center = landscape ? { x: w * 0.5, y: h - 34, s: 1.1 } : { x: w * 0.5, y: h - 52, s: 1.25 }
  const setting = landscape ? { x: w * 0.83, y: h - 40, s: 1.35 } : { x: w * 0.82, y: h - 66, s: 1.55 }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <g transform={`translate(${tower.x} ${tower.y}) scale(${tower.s})`}>
        <ChampagneTower />
      </g>
      <g transform={`translate(${center.x} ${center.y}) scale(${center.s})`}>
        <g transform="translate(-11 0)"><WineGlass /></g>
        <g transform="translate(9 -4)"><Grapes /></g>
      </g>
      <g transform={`translate(${setting.x} ${setting.y}) scale(${setting.s})`}>
        <g transform="translate(-17 2)"><Candle /></g>
        <g transform="translate(0 0)"><Bottle /></g>
        <g transform="translate(17 -2)"><WineGlass /></g>
      </g>
    </svg>
  )
}

const ChampagneFeast = forwardRef(function ChampagneFeast({ welcome, names, dateText, orientation = 'portrait', thumb = false, bg }, ref) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'
  const t = landscape
    ? { welcome: 27, name: 118, date: 24, gap: 18, rule: 210, top: 120 }
    : { welcome: 28, name: 100, date: 24, gap: 22, rule: 220, top: 250 }

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

      <Bunting w={dims.width} />

      {/* Side wildflower sprays, bottom corners. */}
      <div style={{ position: 'absolute', left: -6, bottom: 70 }}>
        <SideSpray />
      </div>
      <div style={{ position: 'absolute', right: -6, bottom: 70 }}>
        <SideSpray flip />
      </div>

      {/* Champagne tower + bottle still life, centre foot (no figures). */}
      <FootStillLife w={dims.width} h={dims.minHeight} landscape={landscape} />

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

export default ChampagneFeast
