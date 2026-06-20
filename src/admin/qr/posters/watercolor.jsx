// Shared watercolor toolkit for the QR-less entrance designs. It gives flat
// vector art a soft, hand-painted feel: organic (displaced) edges, pigment
// washes that deepen where they overlap (multiply), and a faint paper grain.
//
// IMPORTANT: the filter <defs> must render INSIDE each poster node. html-to-image
// only serializes the captured node's subtree on export, so a filter defined
// elsewhere in the document would be dropped and the export would look flat.
// Every poster therefore drops a <WatercolorDefs /> at its root. The ids are
// fixed (not per-instance); duplicate identical defs across the previews on the
// page are harmless because url(#id) resolves to an identical definition.
//
// Thumbnails pass `thumb` to skip the costly displacement passes (a tiny render
// doesn't show the wobble anyway, and 7 live filtered renders would be slow).

export function WatercolorDefs({ thumb = false }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Organic edge wobble for petals, leaves, small washes. */}
        <filter id="wc-rough" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={thumb ? 0 : 6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Larger, blurred bleed for big background washes (sky, meadow). */}
        <filter id="wc-bleed" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={thumb ? 0 : 14} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.3" />
        </filter>
      </defs>
    </svg>
  )
}

// A faint granular paper texture laid over the whole poster (multiply, low
// opacity) so flat fills read as painted rather than printed.
export function PaperGrain({ opacity = 0.045 }) {
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <filter id="wc-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="11" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wc-grain)" />
    </svg>
  )
}

// A soft pigment wash. Colored pigments use multiply so overlaps deepen like wet
// paint; pass blend="normal" for light/white shapes (multiply would erase white).
export function Wash({ d, fill, opacity = 0.85, blend = 'multiply', filter = 'url(#wc-rough)', ...rest }) {
  return <path d={d} fill={fill} opacity={opacity} filter={filter} style={{ mixBlendMode: blend }} {...rest} />
}
