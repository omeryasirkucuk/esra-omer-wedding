// Polling hook for the live feeds (Pano, public album). Two properties matter
// with ~100 phones on one server:
//  • Self-scheduling: the next tick is armed only after the current fetch
//    settles, so a slow server never accumulates stacked in-flight requests
//    per guest (setInterval would keep firing regardless).
//  • Visibility-aware: a tab that is open but not visible skips the network
//    call and just keeps ticking, picking the feed back up when shown again.
import { useEffect, useRef } from 'react'

export function usePoll(fn, ms) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let alive = true
    let timer
    const tick = async () => {
      if (!alive) return
      if (document.visibilityState !== 'hidden') {
        try {
          await fnRef.current()
        } catch {
          /* transient network error — next tick retries */
        }
      }
      if (!alive) return
      timer = setTimeout(tick, ms)
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [ms])
}
