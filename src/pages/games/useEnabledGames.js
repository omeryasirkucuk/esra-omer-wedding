// Which games the couple has switched on. Reads the `enabled` map from the
// games-content doc; a missing key counts as enabled, so the map only ever
// records explicit offs. Fetched fresh on every mount (hub and game routes),
// so flipping a game off in the admin takes effect on the guests' next visit
// without a page reload.
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// Returns null while loading; on fetch errors returns {} (every game visible —
// a blip in the content read must never hide the whole Eğlence Köşesi).
export function useEnabledGames() {
  const [enabled, setEnabled] = useState(null)

  useEffect(() => {
    let alive = true
    api
      .getGamesContent()
      .then((c) => alive && setEnabled(c?.enabled || {}))
      .catch(() => alive && setEnabled({}))
    return () => {
      alive = false
    }
  }, [])

  return enabled
}

export function isGameEnabled(enabledMap, id) {
  return enabledMap?.[id] !== false
}
