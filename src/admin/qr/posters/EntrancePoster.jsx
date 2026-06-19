// The printable entrance sign placed at the hall door. Auto-height so content
// never clips or overlaps; rendered at a modest base size and rasterized to a
// high-res PNG on export. Supports portrait and landscape.
//
// The visual is the couple's photo in an arched frame when one is uploaded, or
// the Emblem in a proportioned champagne medallion otherwise (so the default
// never looks like a tiny logo lost in a big empty frame).
import { forwardRef } from 'react'
import Emblem from '../../../components/Emblem'
import Sprig from '../../../components/Sprig'
import QrBlock from './QrBlock'

const C = {
  ivory: '#fbf7ee',
  ink: '#2f3e4d',
  primary: '#3f5871',
  gold: '#c2a25c',
  goldSoft: '#d8c389',
  champagne: '#f3ead4',
  muted: '#6f7d89',
}

// Base canvas sizes (px) per orientation. minHeight only — the node grows with
// its content so nothing is ever cropped.
export const ENTRANCE_DIMS = {
  portrait: { width: 640, minHeight: 905 },
  landscape: { width: 905, minHeight: 640 },
}

function DateLine({ text, size }) {
  return (
    <div
      className="font-sans"
      style={{ fontSize: size, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold, whiteSpace: 'nowrap' }}
    >
      {text}
    </div>
  )
}

function NameLine({ names, size }) {
  return (
    <div className="font-script" style={{ fontSize: size, lineHeight: 1.16, color: C.primary, padding: '4px 0' }}>
      {names}
    </div>
  )
}

function Headline({ text, size, maxWidth }) {
  return (
    <div className="font-display" style={{ fontStyle: 'italic', fontSize: size, lineHeight: 1.25, color: C.ink, maxWidth }}>
      {text}
    </div>
  )
}

function Description({ text, size, maxWidth }) {
  return (
    <div className="font-display" style={{ fontSize: size, lineHeight: 1.4, color: C.ink, maxWidth }}>
      {text}
    </div>
  )
}

// The couple's photo in a soft arched frame, or the Emblem in a champagne
// medallion sized so the mark fills it (no empty space around a tiny logo).
function Visual({ photoUrl, medallion, archW, archH }) {
  if (photoUrl) {
    return (
      <div
        style={{
          width: archW,
          height: archH,
          borderRadius: `${archW / 2}px ${archW / 2}px 20px 20px`,
          border: `1px solid ${C.goldSoft}`,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div
      style={{
        width: medallion,
        height: medallion,
        borderRadius: '50%',
        background: C.champagne,
        border: `1px solid ${C.goldSoft}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Emblem size={Math.round(medallion * 0.68)} still tone="default" />
    </div>
  )
}

const EntrancePoster = forwardRef(function EntrancePoster(
  { eyebrow, names, headline, description, qrUrl, photoUrl, orientation = 'portrait' },
  ref,
) {
  const dims = ENTRANCE_DIMS[orientation] || ENTRANCE_DIMS.portrait
  const landscape = orientation === 'landscape'

  if (landscape) {
    // Two columns split by a full-height gold rule. The left text is spread
    // evenly down the full height and the right visual + QR are scaled up to
    // nearly fill it, so a large-format print has no dead space.
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
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '38px 42px',
        }}
      >
        <div style={{ position: 'absolute', inset: 22, border: `1px solid ${C.goldSoft}`, pointerEvents: 'none' }} />
        {/* Left: text, spread evenly down the full height */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '8px 26px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <DateLine text={eyebrow} size={20} />
            <NameLine names={names} size={78} />
          </div>
          <Headline text={headline} size={28} maxWidth={400} />
          <Description text={description} size={18} maxWidth={400} />
          <Sprig width={150} />
        </div>
        {/* Vertical gold rule */}
        <div style={{ width: 1, alignSelf: 'stretch', background: C.goldSoft, opacity: 0.5, margin: '14px 0' }} />
        {/* Right: large visual + QR, centred */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: '0 22px' }}>
          <Visual photoUrl={photoUrl} medallion={250} archW={264} archH={310} />
          <QrBlock qrUrl={qrUrl} qrSize={214} boxPad={18} linkSize={13} />
        </div>
      </div>
    )
  }

  // Portrait: scaled-up elements spread evenly down the tall canvas so a
  // large-format print fills the sheet (date + names kept as a tight pair).
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        textAlign: 'center',
        padding: '44px 52px',
      }}
    >
      <div style={{ position: 'absolute', inset: 22, border: `1px solid ${C.goldSoft}`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <DateLine text={eyebrow} size={20} />
        <NameLine names={names} size={86} />
      </div>
      <Visual photoUrl={photoUrl} medallion={222} archW={300} archH={348} />
      <Headline text={headline} size={29} maxWidth={500} />
      <QrBlock qrUrl={qrUrl} qrSize={180} boxPad={16} linkSize={13} />
      <Description text={description} size={19} maxWidth={500} />
      <Sprig width={155} />
    </div>
  )
})

export default EntrancePoster
