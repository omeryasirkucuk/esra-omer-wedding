// The admin shell is not wrapped in the guest SiteProvider, so panels that
// show the couple's names (title bar, Kim Demiş editor) load them once via the
// admin API and fall back to the bundled defaults until that resolves.
import { useEffect, useState } from 'react'
import { getSiteContent } from './adminApi'
import { wedding } from '../data/wedding'

export function useCoupleNames() {
  const [names, setNames] = useState({ bride: wedding.bride, groom: wedding.groom })
  useEffect(() => {
    let alive = true
    getSiteContent()
      .then((stored) => {
        if (!alive || !stored) return
        setNames({
          bride: stored.bride || wedding.bride,
          groom: stored.groom || wedding.groom,
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return names
}
