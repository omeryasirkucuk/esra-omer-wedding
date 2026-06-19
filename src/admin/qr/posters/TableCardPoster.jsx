// The printable table card. Auto-height so content never clips or overlaps (the
// export captures the node's real box); rendered at a modest base size and
// rasterized to a high-res PNG on export. Supports portrait and landscape.
//
// Mirrors the fine-stationery references: couple names in calligraphy, a small
// mark (the Emblem by default, or a line-drawn camera), the QR with the link
// beneath it, a short instruction, and a "HOŞ GELDİNİZ" footer.
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
  muted: '#6f7d89',
}

// Base canvas sizes (px) per orientation. A-series ratio (1 : 1.414). minHeight
// only — the node grows if content needs more, so nothing is ever cropped.
export const TABLE_DIMS = {
  portrait: { width: 380, minHeight: 537 },
  landscape: { width: 537, minHeight: 380 },
}

// A tasteful line-drawn camera with a heart in the lens — the alternative mark.
function CameraMark({ size = 52 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 64 52" aria-hidden="true">
      <g fill="none" stroke={C.primary} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 16 h10 l4 -6 h20 l4 6 h10 a3 3 0 0 1 3 3 v25 a3 3 0 0 1 -3 3 H6 a3 3 0 0 1 -3 -3 V19 a3 3 0 0 1 3 -3 Z" />
        <circle cx="32" cy="32" r="11" stroke={C.gold} />
      </g>
      <path
        d="M32 38 c-4 -3 -7 -5.5 -7 -8.6 a3.1 3.1 0 0 1 6 -1.2 a3.1 3.1 0 0 1 6 1.2 c0 3.1 -3 5.6 -7 8.6 Z"
        fill={C.gold}
      />
    </svg>
  )
}

function MarkGlyph({ mark, size }) {
  return mark === 'camera' ? <CameraMark size={size} /> : <Emblem size={size} still tone="default" />
}

function NameLine({ names, size }) {
  return (
    <div className="font-script" style={{ fontSize: size, lineHeight: 1.18, color: C.primary, padding: '2px 0' }}>
      {names}
    </div>
  )
}

function Tagline({ text, size, maxWidth }) {
  return (
    <div className="font-display" style={{ fontStyle: 'italic', fontSize: size, lineHeight: 1.3, color: C.ink, maxWidth }}>
      {text}
    </div>
  )
}

function Instruction({ text, size, maxWidth }) {
  return (
    <div className="font-sans" style={{ fontSize: size, lineHeight: 1.55, color: C.muted, maxWidth }}>
      {text}
    </div>
  )
}

function Welcome({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 26, height: 1, background: C.goldSoft }} />
      <span className="font-display" style={{ fontSize: 14, letterSpacing: '0.22em', color: C.primary }}>
        {text}
      </span>
      <span style={{ width: 26, height: 1, background: C.goldSoft }} />
    </div>
  )
}

const TableCardPoster = forwardRef(function TableCardPoster(
  { names, tagline, instruction, welcome, qrUrl, mark = 'emblem', orientation = 'portrait' },
  ref,
) {
  const dims = TABLE_DIMS[orientation] || TABLE_DIMS.portrait
  const landscape = orientation === 'landscape'

  const shell = {
    position: 'relative',
    width: dims.width,
    minHeight: dims.minHeight,
    boxSizing: 'border-box',
    background: C.ivory,
    color: C.ink,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: landscape ? '30px 34px' : '38px 30px',
    gap: landscape ? 16 : 15,
  }

  return (
    <div ref={ref} style={shell}>
      {/* Double gold hairline frame */}
      <div style={{ position: 'absolute', inset: 14, border: `1px solid ${C.goldSoft}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 19, border: `1px solid ${C.goldSoft}`, opacity: 0.55, pointerEvents: 'none' }} />

      {landscape ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <NameLine names={names} size={40} />
            <Sprig width={140} />
          </div>
          {/* Stretch the left column to the QR's height and space its contents so
              the mark sits at the QR's top edge and "HOŞ GELDİNİZ" at its bottom. */}
          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 34, width: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <MarkGlyph mark={mark} size={86} />
              <Tagline text={tagline} size={16} maxWidth={230} />
              <Welcome text={welcome} />
            </div>
            <QrBlock qrUrl={qrUrl} qrSize={140} boxPad={14} linkSize={11} />
          </div>
          <Instruction text={instruction} size={10.5} maxWidth={480} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <NameLine names={names} size={42} />
            <Sprig width={120} />
          </div>
          <MarkGlyph mark={mark} size={62} />
          <Tagline text={tagline} size={16} maxWidth={250} />
          <QrBlock qrUrl={qrUrl} qrSize={132} boxPad={13} linkSize={10} />
          <Instruction text={instruction} size={10.5} maxWidth={270} />
          <Welcome text={welcome} />
        </>
      )}
    </div>
  )
})

export default TableCardPoster
