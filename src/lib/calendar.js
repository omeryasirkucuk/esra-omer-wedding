// "Takvime Ekle" helpers. The .ics download works on iOS, Android and desktop
// calendars; the Google link covers Google Calendar users. No external deps.
//
// The event is derived from the live wedding details (so editing the date in
// the admin updates the calendar entry too). It starts at the site's arrival
// time (dateISO) and runs ~4 hours.

function toICSDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// iCalendar property-parameter values that contain ":", ";" or "," must be
// wrapped in double quotes (RFC 5545 §3.1). The structured-location X-ADDRESS
// holds the street address ("No:11", commas); an unquoted ":" truncates the
// parameter and Apple Calendar drops the map entirely.
function icsParam(value) {
  return `"${String(value).replace(/"/g, "'").replace(/[\r\n]+/g, ' ')}"`
}

function eventFromWedding(w) {
  const start = new Date(w.dateISO)
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
  return {
    title: `${w.bride} & ${w.groom} — Düğün`,
    description: `${w.bride} & ${w.groom}'in düğününe davetlisiniz.`,
    location: `${w.venue.name}, ${w.venue.address}`,
    venueName: w.venue.name,
    geo: w.venue.geo,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export function buildICS(w) {
  const e = eventFromWedding(w)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//esra-omer//wedding//TR',
    'BEGIN:VEVENT',
    `UID:${toICSDate(e.startISO)}-esra-omer@wedding`,
    `DTSTAMP:${toICSDate(e.startISO)}`,
    `DTSTART:${toICSDate(e.startISO)}`,
    `DTEND:${toICSDate(e.endISO)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${e.description}`,
    `LOCATION:${e.location}`,
  ]
  // Anchor the map pin on the exact venue coordinates so the calendar does not
  // geocode the address text and drop the pin on the wrong block.
  if (e.geo && Number.isFinite(e.geo.lat) && Number.isFinite(e.geo.lng)) {
    lines.push(`GEO:${e.geo.lat};${e.geo.lng}`)
    lines.push(
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=${icsParam(e.location)};` +
        `X-APPLE-RADIUS=72;X-TITLE=${icsParam(e.venueName)}:geo:${e.geo.lat},${e.geo.lng}`
    )
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(w) {
  const blob = new Blob([buildICS(w)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'esra-omer-dugun.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function googleCalendarUrl(w) {
  const e = eventFromWedding(w)
  // Google's web template geocodes the `location` text — and the street address
  // lands on the wrong block (same issue Apple had). Anchor the pin on the exact
  // coordinates instead, and keep the readable venue + address in the notes.
  const geo = w.venue?.geo
  const location =
    geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng) ? `${geo.lat},${geo.lng}` : e.location
  const details = `${e.description}\n\n${e.location}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toICSDate(e.startISO)}/${toICSDate(e.endISO)}`,
    details,
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
