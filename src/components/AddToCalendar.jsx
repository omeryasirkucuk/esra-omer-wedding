import { useState } from 'react'
import { googleCalendarUrl } from '../lib/calendar.js'
import { useSite } from '../lib/siteContent.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

// Detect the platform once so we can route to whatever actually opens the
// native calendar app there.
function platform() {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

const CalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2" y="3" width="12" height="11" rx="1.5" />
    <path d="M2 6 H14 M5 1.5 V4 M11 1.5 V4" />
  </svg>
)

// "Takvime Ekle". The .ics file opens the native calendar app directly — Apple
// Calendar on iOS, and the default calendar (usually Google Calendar) on Android.
// Google's web template URL (`calendar.google.com/render`) only adds the event in
// the browser, so we use it for desktop / as a secondary "open in browser" path
// and route the in-app adds through the .ics instead.
export default function AddToCalendar() {
  const [open, setOpen] = useState(false)
  const wedding = useSite()
  const icsHref = `${API_BASE}/api/calendar.ics`
  const googleHref = googleCalendarUrl(wedding)

  const p = platform()
  const options =
    p === 'ios'
      ? [
          { label: 'Apple Takvim', href: icsHref },
          { label: 'Google Takvim', href: googleHref, external: true },
        ]
      : p === 'android'
        ? [
            { label: 'Google Takvim', href: icsHref },
            { label: 'Tarayıcıda Aç', href: googleHref, external: true },
          ]
        : [
            { label: 'Google Takvim', href: googleHref, external: true },
            { label: '.ics İndir', href: icsHref },
          ]

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-sans uppercase inline-flex items-center gap-1.5 text-muted border border-line rounded-[2px] px-3 py-1.5 bg-surface/70"
        style={{ letterSpacing: '0.18em', fontSize: '0.5rem' }}
      >
        <CalIcon /> Takvime Ekle
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 card-soft shadow-lg overflow-hidden w-40">
          {options.map((opt, i) => (
            <a
              key={opt.label}
              href={opt.href}
              {...(opt.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              onClick={() => setOpen(false)}
              className={`block w-full text-left px-4 py-2.5 font-display text-primary text-sm hover:bg-[#f4ecdd] ${
                i > 0 ? 'border-t border-[#ece2c9]' : ''
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
