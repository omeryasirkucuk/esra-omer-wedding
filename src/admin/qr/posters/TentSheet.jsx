// Foldable table-tent ("üçgen baskılık") composer. Wraps any single card face
// twice on one tall ivory sheet — the back face rotated 180° so it reads upright
// once folded over the apex — plus a short blank base panel that lies flat on the
// table. Printed and folded on the two crease lines it stands on its own, legible
// from both sides. This wrapper IS the export node (a forwardRef), so the existing
// html-to-image capture and the 300-DPI PDF sizing work unchanged.
//
// Layout, top → bottom (matches the couple's mock-up):
//   1. blank base panel   — folds under, parallel to the table
//   2. back face (180°)   — the reverse side
//   3. apex fold gap      — small blank band so the crease misses the artwork
//   4. front face         — the side facing you
import { forwardRef } from 'react'

const IVORY = '#fbf7ee'
// Faint dashed gold crease guides — visible enough to fold by, subtle enough not
// to distract in the print.
const GUIDE = '1px dashed rgba(194, 162, 92, 0.5)'

// Reuse each face at its native card size; pick a pixel ratio so a face's short
// side lands at ~100 mm at 300 DPI (portrait ≈ 100×141 mm, landscape ≈ 141×100 mm
// per face). 380 is the card's short-side base width in px.
export const TENT_EXPORT_RATIO = (100 / 25.4) * 300 / 380 // ≈ 3.1

const TentSheet = forwardRef(function TentSheet(
  { faceWidth, faceHeight, showGuides = true, renderFace },
  ref,
) {
  // Short blank panel — the surface that rests on the table once folded.
  const baseHeight = Math.round(faceHeight * 0.44)
  // Small blank gap at the apex fold so the crease doesn't run through the design.
  const apexGap = 12

  const root = {
    position: 'relative',
    width: faceWidth,
    boxSizing: 'border-box',
    background: IVORY,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  }

  return (
    <div ref={ref} style={root}>
      {/* 1 — blank base panel */}
      <div style={{ height: baseHeight }} />

      {/* base-fold crease */}
      {showGuides && <div style={{ height: 0, borderTop: GUIDE, margin: '0 8px' }} />}

      {/* 2 — back face, rotated so it reads upright from behind */}
      <div style={{ transform: 'rotate(180deg)' }}>{renderFace()}</div>

      {/* 3 — apex fold gap with its crease centred */}
      <div style={{ height: apexGap, position: 'relative' }}>
        {showGuides && (
          <div style={{ position: 'absolute', top: '50%', left: 8, right: 8, borderTop: GUIDE }} />
        )}
      </div>

      {/* 4 — front face */}
      <div>{renderFace()}</div>
    </div>
  )
})

export default TentSheet
