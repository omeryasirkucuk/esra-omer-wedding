// The printable guest/table-group card. Placed on a table to say which group
// sits there (e.g. "P&G", "Üniversite", "Aile"). No QR — just the couple's
// names, the Emblem, a welcome, and the group label set large as the focal
// point. Auto-height so nothing clips; portrait and landscape.
import { forwardRef } from 'react'
import Emblem from '../../../components/Emblem'
import Sprig from '../../../components/Sprig'
import FitText from '../FitText'

const C = {
  ivory: '#fbf7ee',
  ink: '#2f3e4d',
  primary: '#3f5871',
  goldSoft: '#d8c389',
}

// Same A-series base sizes as the table card.
export const GUEST_DIMS = {
  portrait: { width: 380, minHeight: 537 },
  landscape: { width: 537, minHeight: 380 },
}

function NameLine({ names, size }) {
  return (
    <div className="font-script" style={{ fontSize: size, lineHeight: 1.18, color: C.primary, padding: '2px 0' }}>
      {names}
    </div>
  )
}

function Welcome({ text, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 24, height: 1, background: C.goldSoft }} />
      <span className="font-display" style={{ fontSize: size, letterSpacing: '0.22em', color: C.primary }}>
        {text}
      </span>
      <span style={{ width: 24, height: 1, background: C.goldSoft }} />
    </div>
  )
}

const GuestCardPoster = forwardRef(function GuestCardPoster(
  { names, welcome, group, orientation = 'portrait' },
  ref,
) {
  const dims = GUEST_DIMS[orientation] || GUEST_DIMS.portrait
  const landscape = orientation === 'landscape'

  // The names + emblem + welcome sit in one tight cluster anchored near the top;
  // the group label then fills the remaining space, set large as the focal point.
  const sizes = landscape
    ? { name: 38, emblem: 62, welcome: 11, group: 100, groupMin: 30, sprig: 130, clusterGap: 13, pad: '30px 40px' }
    : { name: 42, emblem: 80, welcome: 14, group: 94, groupMin: 28, sprig: 120, clusterGap: 16, pad: '46px 32px' }

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
        justifyContent: 'flex-start',
        textAlign: 'center',
        padding: sizes.pad,
      }}
    >
      {/* Double gold hairline frame */}
      <div style={{ position: 'absolute', inset: 14, border: `1px solid ${C.goldSoft}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 19, border: `1px solid ${C.goldSoft}`, opacity: 0.55, pointerEvents: 'none' }} />

      {/* Top cluster: names → divider → emblem → welcome, kept tight together */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sizes.clusterGap }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <NameLine names={names} size={sizes.name} />
          <Sprig width={sizes.sprig} />
        </div>
        <Emblem size={sizes.emblem} still tone="default" />
        <Welcome text={welcome} size={sizes.welcome} />
      </div>

      {/* Group label fills the remaining space, centred and auto-scaled so a long
          name shrinks to fit instead of overflowing the card. */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: '6px 4px' }}>
          <FitText
            text={group}
            maxSize={sizes.group}
            minSize={sizes.groupMin}
            className="font-display"
            style={{ fontWeight: 600, lineHeight: 1.06, color: C.primary, letterSpacing: '0.01em' }}
          />
        </div>
      </div>
    </div>
  )
})

export default GuestCardPoster
