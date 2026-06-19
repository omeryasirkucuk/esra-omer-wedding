// The QR inside a hairline frame, with the link shown small directly beneath it.
// Shared by both posters so the QR + link pairing is consistent.
import QrCode, { hostLabel } from '../QrCode'

const GOLD_SOFT = '#d8c389'
const MUTED = '#6f7d89'

export default function QrBlock({ qrUrl, qrSize = 150, boxPad = 14, linkSize = 11 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div
        style={{
          background: '#ffffff',
          padding: boxPad,
          border: `1px solid ${GOLD_SOFT}`,
          borderRadius: 8,
          lineHeight: 0,
        }}
      >
        <QrCode value={qrUrl} size={qrSize} />
      </div>
      <span className="font-sans" style={{ fontSize: linkSize, letterSpacing: '0.14em', color: MUTED }}>
        {hostLabel(qrUrl)}
      </span>
    </div>
  )
}
