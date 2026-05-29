// Single source of truth for the event details shown across the site.
// All guest-facing copy here is Turkish by design.
export const wedding = {
  bride: 'Esra',
  groom: 'Ömer',
  // ISO date-time in Europe/Istanbul (UTC+3). This is the arrival/welcome time
  // shown across the site; the detailed schedule (welcome 19:30, ceremony
  // 20:00) lives in `program` below. Both are editable from the admin.
  dateISO: '2026-07-17T19:30:00+03:00',
  dateLabel: '17 Temmuz 2026',
  dayLabel: 'Cuma',
  timeLabel: '19:30',
  quote: 'Bu mutlu günümüzde sizi de aramızda görmek isteriz.',
  closing: 'Sevgiyle bekleriz',
  families: [
    { parents: 'Gülnaz · İlhan', surname: 'Şahin' },
    { parents: 'Ayşegül · Muhammet', surname: 'Küçük' },
  ],
  program: [
    { icon: 'sparkle', title: 'Karşılama', time: '19:30' },
    { icon: 'heart', title: 'Nikah Töreni', time: '20:00' },
  ],
  venue: {
    name: 'Family Garden Kavacık',
    address: 'Fatih Mah. Cumhuriyet Cad. İnci Sok. No:11, Beykoz / İstanbul',
    // Used for the "Yol Tarifi Al" button.
    mapsQuery: 'Family Garden Kavacık, Fatih Mah. Cumhuriyet Cad. İnci Sok. No:11 Beykoz İstanbul',
  },
}

// Calendar event metadata for the "Takvime Ekle" feature.
export const calendarEvent = {
  title: 'Esra & Ömer — Düğün',
  description: 'Esra & Ömer’in nikah törenine davetlisiniz.',
  location: 'Family Garden Kavacık, Fatih Mah. Cumhuriyet Cad. İnci Sok. No:11, Beykoz / İstanbul',
  startISO: '2026-07-17T19:30:00+03:00',
  endISO: '2026-07-17T23:30:00+03:00',
}
