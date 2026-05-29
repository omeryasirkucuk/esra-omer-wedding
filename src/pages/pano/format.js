// Small presentation helpers for the memory board.

const MONTHS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]

// Turkish relative timestamp: "az önce", "N dk önce", "N sa önce",
// otherwise an absolute short date like "17 Tem 14:05".
export function timeAgo(iso, now = Date.now()) {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, now - then)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'az önce'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} dk önce`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} sa önce`
  const d = new Date(then)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${hh}:${mm}`
}

// Muted avatar tones; pick deterministically from the name so the same
// guest always gets the same colour.
const AVATAR_TONES = ['#7d8a9b', '#a98ca0', '#8a9a7b', '#b98ca0']

export function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
}

export function initial(name = '') {
  const ch = name.trim().charAt(0)
  return ch ? ch.toLocaleUpperCase('tr') : '?'
}
