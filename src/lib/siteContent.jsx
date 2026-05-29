import { createContext, useContext, useEffect, useState } from 'react'
import { wedding as defaultWedding } from '../data/wedding.js'
import { api } from './api.js'

// Provides the wedding details to the whole guest site. Defaults come from
// src/data/wedding.js; anything the couple edits in the admin (stored as
// site_content.json) is merged on top and applied live — including the date.
const SiteContext = createContext(defaultWedding)

function merge(base, override) {
  if (!override || typeof override !== 'object') return base
  const out = { ...base }
  for (const key of Object.keys(override)) {
    const val = override[key]
    if (val === undefined || val === null || val === '') continue
    if (Array.isArray(val)) {
      if (val.length) out[key] = val
    } else if (typeof val === 'object') {
      out[key] = merge(base[key] || {}, val)
    } else {
      out[key] = val
    }
  }
  return out
}

export function SiteProvider({ children }) {
  const [wedding, setWedding] = useState(defaultWedding)
  useEffect(() => {
    api
      .getSiteContent()
      .then((stored) => setWedding(merge(defaultWedding, stored)))
      .catch(() => {})
  }, [])
  return <SiteContext.Provider value={wedding}>{children}</SiteContext.Provider>
}

export function useSite() {
  return useContext(SiteContext)
}
