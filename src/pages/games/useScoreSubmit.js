// Submits a single score to the scoreboard exactly once when a game finishes.
//
// `ready` is the win/done flag; when it flips true the first time, `build()` is
// called to assemble the { game, score, label, detail } payload and the result
// is POSTed via api.submitScore. A ref guard prevents duplicate submissions on
// re-render, and the guard resets whenever `ready` goes back to false (replay).
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

export function useScoreSubmit(ready, build) {
  const sentRef = useRef(false)
  const [submitted, setSubmitted] = useState(false)
  // Keep the latest build function without retriggering the effect.
  const buildRef = useRef(build)
  buildRef.current = build

  useEffect(() => {
    if (!ready) {
      // A replay resets the game; allow a fresh submission next finish.
      sentRef.current = false
      setSubmitted(false)
      return
    }
    if (sentRef.current) return
    sentRef.current = true
    Promise.resolve()
      .then(() => api.submitScore(buildRef.current()))
      .then(() => setSubmitted(true))
      .catch(() => {
        // Network hiccup: do not block the end screen; allow a retry on replay.
        sentRef.current = false
      })
  }, [ready])

  return submitted
}
