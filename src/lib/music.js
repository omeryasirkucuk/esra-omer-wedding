// One app-wide audio element for the invitation's background music.
//
// It lives at module scope so it survives SPA navigation, and is unlocked
// inside the home "Davetiye" tap (primeMusic) so iOS keeps it playing on the
// invitation page.
//
// iOS rule that bit us: calling play() WITHOUT a gesture "resolves" but plays
// silently, and once the element is in that silent-playing state a later
// gesture's play() does NOT re-route it to the speaker. So for a direct visit
// (no prior tap) we must NOT auto-play — we leave the element paused and start
// it from the first real tap, where play() on a *paused* element unlocks audio.
//
// Reference counting: the route transition mounts the invitation twice for a
// moment; we only fade out when the count truly reaches zero.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const SRC = `${API_BASE}/api/music`
const TARGET = 0.35

let audio = null
let primed = false
let active = 0
let stopTimer = null
let fadeId = null
let gestureCleanup = null

function element() {
  if (!audio) {
    audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.src = SRC
    audio.volume = TARGET
  }
  return audio
}
function clearFade() {
  if (fadeId) clearInterval(fadeId)
  fadeId = null
}
// Start on the first real in-page gesture (used on a direct /davetiye visit).
// The element is paused here, so play() inside the gesture unlocks audible sound.
function armGesture(a) {
  if (gestureCleanup) return
  const evs = ['touchend', 'click', 'keydown']
  const handler = () => {
    cleanup()
    primed = true
    a.volume = TARGET
    a.play().catch(() => {})
  }
  const cleanup = () => {
    evs.forEach((e) => window.removeEventListener(e, handler))
    gestureCleanup = null
  }
  evs.forEach((e) => window.addEventListener(e, handler, { passive: true }))
  gestureCleanup = cleanup
}

export function isPrimed() {
  return primed
}

// Call SYNCHRONOUSLY inside the tap that navigates to /davetiye (home/menu).
export function primeMusic() {
  const a = element()
  primed = true
  clearFade()
  a.volume = TARGET
  a.play().catch(() => {})
}

// Bind to an invitation mount; returns a cleanup for useEffect.
export function bindInvitationMusic() {
  const a = element()
  active += 1
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  clearFade()
  if (primed) {
    a.volume = TARGET
    a.play().catch(() => {})
  } else {
    armGesture(a) // direct visit: stay paused, start on first tap
  }

  const onVisibility = () => {
    if (document.hidden) a.pause()
    else if (active > 0 && primed) a.play().catch(() => {})
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    active = Math.max(0, active - 1)
    if (active > 0) return
    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = setTimeout(() => {
      stopTimer = null
      if (active > 0) return
      if (gestureCleanup) gestureCleanup()
      clearFade()
      const start = a.volume
      let i = 0
      fadeId = setInterval(() => {
        i += 1
        a.volume = Math.max(0, start - (start / 12) * i)
        if (i >= 12) {
          clearFade()
          a.pause()
          a.volume = TARGET
        }
      }, 80)
    }, 350)
  }
}
