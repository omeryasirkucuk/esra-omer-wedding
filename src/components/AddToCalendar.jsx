import { useState } from 'react'
import { googleCalendarUrl } from '../lib/calendar.js'
import { useSite } from '../lib/siteContent.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const CalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2" y="3" width="12" height="11" rx="1.5" />
    <path d="M2 6 H14 M5 1.5 V4 M11 1.5 V4" />
  </svg>
)

// Small "Takvime Ekle" control. Works on phone and desktop: .ics for
// Apple/Android/Outlook, plus a direct Google Calendar link.
export default function AddToCalendar() {
  const [open, setOpen] = useState(false)
  const wedding = useSite()
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
          {/* iOS: linking to a text/calendar URL opens the Apple Calendar add
              sheet directly (no file download). Works on desktop too. */}
          <a
            href={`${API_BASE}/api/calendar.ics`}
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2.5 font-display text-primary text-sm hover:bg-[#f4ecdd]"
          >
            iOS
          </a>
          <a
            href={googleCalendarUrl(wedding)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2.5 font-display text-primary text-sm hover:bg-[#f4ecdd] border-t border-[#ece2c9]"
          >
            Google Takvim
          </a>
        </div>
      )}
    </div>
  )
}
