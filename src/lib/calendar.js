// "Takvime Ekle" helpers. The .ics download works on iOS, Android and desktop
// calendars; the Google link covers Google Calendar users. No external deps.
//
// The event is derived from the live wedding details (so editing the date in
// the admin updates the calendar entry too). It starts at the site's arrival
// time (dateISO) and runs ~4 hours.

function toICSDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function eventFromWedding(w) {
  const start = new Date(w.dateISO)
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
  return {
    title: `${w.bride} & ${w.groom} — Düğün`,
    description: `${w.bride} & ${w.groom}'in düğününe davetlisiniz.`,
    location: `${w.venue.name}, ${w.venue.address}`,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export function buildICS(w) {
  const e = eventFromWedding(w)
  return [
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
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
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
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toICSDate(e.startISO)}/${toICSDate(e.endISO)}`,
    details: e.description,
    location: e.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
