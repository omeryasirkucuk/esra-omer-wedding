// Entrance design 3 — "Bahçe Şöleni". A festive garden party: a string-light
// garland swags across the top, wildflower stems rise up the sides, and a
// champagne tower with dancing guests fills the foot. The welcome copy sits in
// the open upper-middle. QR-less. Portrait + landscape.
import { forwardRef } from 'react'
import { ENTRANCE_DIMS } from '../EntrancePoster'
import { WatercolorDefs, PaperGrain } from '../watercolor'
import { Bunting, SideSpray } from './festive'
import dancersArt from '../assets/dancers.png'

const C = {
  cream: '#f7f1e4',
  ink: '#324252',
  primary: '#3f5871',
  gold: '#c2a25c',
  muted: '#6f7d89',
}

const GardenFeast = forwardRef(function GardenFeast({ welcome, names, dateText, orientation = 'portrait', thumb = false, bg }, ref) {
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
