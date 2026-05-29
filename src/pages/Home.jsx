import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Emblem from '../components/Emblem.jsx'
import { useSite } from '../lib/siteContent.jsx'
import { primeMusic } from '../lib/music.js'

// The QR landing page: one elegant hub linking to the four sections.
const DOORS = [
  {
    to: '/davetiye',
    name: 'Davetiye',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    to: '/pano',
    name: 'Anı Panosu',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.38 8.38 0 01-4-1L3 20l1-4.5a8.38 8.38 0 01-1-4A8.5 8.5 0 1121 11.5z" />
      </svg>
    ),
  },
  {
    to: '/oyunlar',
    name: 'Oyunlar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M7 12h3M8.5 10.5v3" />
        <circle cx="16" cy="11" r="1" />
        <circle cx="18" cy="14" r="1" />
      </svg>
    ),
  },
  {
    to: '/album',
    name: 'Albüm',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <circle cx="12" cy="13" r="3.2" />
        <path d="M8 6l1.5-2h5L16 6" />
      </svg>
    ),
  },
]

export default function Home() {
  const wedding = useSite()
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <Emblem className="w-28 md:w-44" />
      <h1 className="font-script text-primary text-5xl md:text-7xl mt-4 leading-none">
        {wedding.bride} &amp; {wedding.groom}
      </h1>
      <p className="label mt-3">
        {wedding.dateLabel} · {wedding.timeLabel} · <span lang="en">{wedding.venue.name.split(' ').slice(0, 2).join(' ')}</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-sm md:max-w-3xl mt-9">
        {DOORS.map((d, i) => (
          <motion.div
            key={d.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
          >
            <Link
              to={d.to}
              onClick={d.to === '/davetiye' ? primeMusic : undefined}
              className="card-soft flex flex-col items-center justify-center py-6 md:py-9 px-2 h-full hover:-translate-y-0.5 transition-transform"
            >
              <span className="w-11 h-11 md:w-14 md:h-14 rounded-full border border-gold flex items-center justify-center text-primary mb-2 bg-gradient-to-b from-surface to-[#f4ecdd]">
                {d.icon}
              </span>
              <span className="font-display text-primary text-lg md:text-xl">{d.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
