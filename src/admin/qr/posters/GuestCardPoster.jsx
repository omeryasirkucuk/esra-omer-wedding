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
  { names, welcome, group, subtitle, orientation = 'portrait' },
  ref,
) {
  const dims = GUEST_DIMS[orientation] || GUEST_DIMS.portrait
  const landscape = orientation === 'landscape'
  const hasSubtitle = Boolean(subtitle && subtitle.trim())

  // The names + emblem + welcome sit in one tight cluster anchored near the top;
  // the group label then fills the remaining space, set large as the focal point.
  const sizes = landscape
    ? { name: 38, emblem: 62, welcome: 11, group: 100, groupMin: 30, sprig: 130, clusterGap: 13, pad: '30px 40px', subtitle: 20, subtitleGap: 12, titleBox: 118 }
    : { name: 42, emblem: 80, welcome: 14, group: 94, groupMin: 28, sprig: 120, clusterGap: 16, pad: '46px 32px', subtitle: 23, subtitleGap: 14, titleBox: 140 }

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

      {/* Lower zone: the group label is the focal point, auto-scaled so a long
          name shrinks to fit. When a side label (Gelin / Damat) is set, the name
          and side sit together as one tight cluster, centred in the zone, so the
          side never strands at the bottom edge. */}
      <div
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            // Fill the zone when there's no side label (unchanged look); otherwise
            // take a fixed focal height so the cluster stays tight and centred.
            flex: hasSubtitle ? '0 0 auto' : 1,
            height: hasSubtitle ? sizes.titleBox : undefined,
            minHeight: 0,
          }}
        >
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
        {hasSubtitle ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, marginTop: sizes.subtitleGap }}>
            <span style={{ width: 26, height: 1, background: C.goldSoft }} />
            <span
              lang="tr"
              className="font-display"
              style={{
                fontSize: sizes.subtitle,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color: C.primary,
                opacity: 0.82,
                paddingLeft: '0.26em',
              }}
            >
              {subtitle.trim()}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
})

export default GuestCardPoster
