// One app-wide audio element for the invitation's background music.
//
// It lives at module scope so it survives SPA navigation, and it is unlocked
// inside the home "Davetiye" tap (primeMusic) so iOS keeps it playing on the
// invitation page.
//
// Reference counting: the route transition (AnimatePresence "wait" + a
// pathname-keyed <Outlet/>) briefly mounts the invitation TWICE (mount → the
// old wrapper unmounts → new wrapper mounts). A naive pause-on-unmount killed
// the shared audio mid-transition. So we count active mounts and only fade out
// when the count truly reaches zero (and stays there) — i.e. the guest has
// really left the invitation.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const SRC = `${API_BASE}/api/music`
const TARGET = 0.35

let audio = null
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
// Direct-visit fallback: start on the first real in-page gesture.
function armGesture(a) {
  if (gestureCleanup) return
  const evs = ['touchend', 'click', 'keydown']
  const handler = () => {
    cleanup()
    a.play().catch(() => {})
  }
  const cleanup = () => {
    evs.forEach((e) => window.removeEventListener(e, handler))
    gestureCleanup = null
  }
  evs.forEach((e) => window.addEventListener(e, handler, { passive: true }))
  gestureCleanup = cleanup
}

// Call SYNCHRONOUSLY inside the tap that navigates to /davetiye (home/menu).
export function primeMusic() {
  const a = element()
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
  a.volume = TARGET
  a.play().catch(() => armGesture(a))

  const onVisibility = () => {
    if (document.hidden) a.pause()
    else if (active > 0) a.play().catch(() => {})
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    active = Math.max(0, active - 1)
    if (active > 0) return // still mounted elsewhere (transition) — keep playing
    if (stopTimer) clearTimeout(stopTimer)
    // Defer; a re-mount during the transition cancels this before it runs.
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
