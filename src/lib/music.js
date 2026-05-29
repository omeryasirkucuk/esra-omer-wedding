// One app-wide audio element for the invitation's background music.
//
// It lives at module scope (outside React components) so it SURVIVES the SPA
// navigation. The trick for iOS: we unlock/start it synchronously inside the
// tap that navigates to the invitation (primeMusic, called from the home
// "Davetiye" tap). Because the same element keeps living across the route
// change, iOS lets it go on playing on the invitation page — no extra tap.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const SRC = `${API_BASE}/api/music`
const TARGET = 0.35

let audio = null
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

// Call SYNCHRONOUSLY inside the user gesture that navigates to /davetiye.
export function primeMusic() {
  const a = element()
  a.volume = TARGET
  a.play().catch(() => {})
}

// Bind to the invitation page lifecycle. Ensures playback (the primed element
// keeps going; on a direct visit it starts on the first in-page tap) and fades
// out when leaving. Returns a cleanup for useEffect.
export function bindInvitationMusic() {
  const a = element()
  let rampId = null
  let removeGesture = null

  a.volume = TARGET
  a.play().catch(() => {
    // Direct visit (e.g. QR straight to /davetiye): no prior gesture yet.
    const evs = ['touchend', 'click', 'keydown']
    const on = () => {
      evs.forEach((e) => window.removeEventListener(e, on))
      removeGesture = null
      a.play().catch(() => {})
    }
    evs.forEach((e) => window.addEventListener(e, on, { passive: true }))
    removeGesture = () => evs.forEach((e) => window.removeEventListener(e, on))
  })

  const onVisibility = () => {
    if (document.hidden) a.pause()
    else a.play().catch(() => {})
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    if (removeGesture) removeGesture()
    if (rampId) clearInterval(rampId)
    // Gentle fade-out, then stop (reset volume so it's ready next time).
    const start = a.volume
    let i = 0
    rampId = setInterval(() => {
      i += 1
      a.volume = Math.max(0, start - (start / 14) * i)
      if (i >= 14) {
        clearInterval(rampId)
        rampId = null
        a.pause()
        a.volume = TARGET
      }
    }, 80)
  }
}
