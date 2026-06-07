// Shared icon set for the "Etkinlik Programı" rows. One source of truth used by
// both the guest invitation (Deck) and the admin editor, so the options stay in
// sync. Glyphs are monochrome typographic characters (not emoji) so they inherit
// the gold/rose text color and match the fine-stationery look.
//
// `key` is the stored value (stable, never translated). `label` is the Turkish
// name shown in the admin. `tone` picks the accent color.
export const PROGRAM_ICONS = [
  { key: 'sparkle', label: 'Yıldız', glyph: '✦', tone: 'gold' },
  { key: 'heart', label: 'Kalp', glyph: '♥', tone: 'rose' },
  { key: 'flower', label: 'Çiçek', glyph: '❀', tone: 'rose' },
  { key: 'floral', label: 'Yaprak', glyph: '❧', tone: 'gold' },
  { key: 'diamond', label: 'Elmas', glyph: '❖', tone: 'gold' },
  { key: 'ring', label: 'Yüzük', glyph: '⚭', tone: 'gold' },
  { key: 'music', label: 'Müzik', glyph: '♫', tone: 'gold' },
  { key: 'crown', label: 'Taç', glyph: '♛', tone: 'gold' },
  { key: 'star', label: 'Dolu Yıldız', glyph: '★', tone: 'gold' },
  { key: 'leaf', label: 'Filiz', glyph: '❦', tone: 'rose' },
  { key: 'infinity', label: 'Sonsuzluk', glyph: '∞', tone: 'gold' },
]

const BY_KEY = Object.fromEntries(PROGRAM_ICONS.map((i) => [i.key, i]))

// Resolve a stored icon key to its descriptor, falling back to the first icon so
// older/unknown values still render something sensible.
export function programIcon(key) {
  return BY_KEY[key] || PROGRAM_ICONS[0]
}

// Tailwind text-color class for an icon tone.
export function iconToneClass(tone) {
  return tone === 'rose' ? 'text-rose' : 'text-gold'
}
