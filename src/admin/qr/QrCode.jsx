// On-brand QR code for the printable posters. Renders as SVG so it stays crisp
// at any export scale, in the site's dusty-ink colour on ivory. Level "H" error
// correction keeps it scannable even on cheaper prints or if a corner smudges.
import { QRCodeSVG } from 'qrcode.react'

// Ensure the encoded value is a real URL so phone cameras open it directly even
// if the admin typed a bare domain ("esraomer.com" → "https://esraomer.com").
export function normalizeUrl(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

// Short, human label for the link shown under the QR ("esraomer.com").
export function hostLabel(value) {
  try {
    return new URL(normalizeUrl(value)).host.replace(/^www\./, '')
  } catch {
    return 'esraomer.com'
  }
}

export default function QrCode({ value, size = 150, fg = '#2f3e4d', bg = '#ffffff' }) {
  return (
    <QRCodeSVG
      value={normalizeUrl(value) || 'https://esraomer.com'}
      size={size}
      level="H"
      fgColor={fg}
      bgColor={bg}
      // A 2-module white quiet zone keeps the code reliably scannable on print.
      marginSize={2}
    />
  )
}
