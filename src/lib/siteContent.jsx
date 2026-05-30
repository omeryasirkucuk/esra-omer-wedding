import { createContext, useContext, useEffect, useState } from 'react'
import { wedding as defaultWedding } from '../data/wedding.js'
import { api } from './api.js'

// Provides the wedding details to the whole guest site. Defaults come from
// src/data/wedding.js; anything the couple edits in the admin (stored as
// site_content.json) is merged on top and applied live — including the date.
const SiteContext = createContext(defaultWedding)
// Whether the stored site content has loaded yet. Routing gates wait for this so
// guests never see a flash of the hub before a redirect (or vice versa).
const ReadyContext = createContext(false)

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
  const [ready, setReady] = useState(false)
  useEffect(() => {
    api
      .getSiteContent()
      .then((stored) => setWedding(merge(defaultWedding, stored)))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])
  return (
    <SiteContext.Provider value={wedding}>
      <ReadyContext.Provider value={ready}>{children}</ReadyContext.Provider>
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}

export function useSiteReady() {
  return useContext(ReadyContext)
}
