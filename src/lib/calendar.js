// "Takvime Ekle" helpers. The .ics download works on iOS, Android and desktop
// calendars; the Google link covers Google Calendar users. No external deps.
import { calendarEvent } from '../data/wedding.js'

// 2026-07-17T19:30:00+03:00 -> 20260717T163000Z (UTC, Google/ICS basic format)
function toICSDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildICS() {
  const e = calendarEvent
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//esra-omer//wedding//TR',
    'BEGIN:VEVENT',
    `UID:${toICSDate(e.startISO)}-esra-omer@wedding`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(e.startISO)}`,
    `DTEND:${toICSDate(e.endISO)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${e.description}`,
    `LOCATION:${e.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadICS() {
  const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'esra-omer-dugun.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function googleCalendarUrl() {
  const e = calendarEvent
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toICSDate(e.startISO)}/${toICSDate(e.endISO)}`,
    details: e.description,
    location: e.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
