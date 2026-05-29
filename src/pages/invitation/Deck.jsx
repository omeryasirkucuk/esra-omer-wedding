import { useEffect, useRef, useState } from 'react'
import Emblem from '../../components/Emblem.jsx'
import Sprig from '../../components/Sprig.jsx'
import Countdown from '../../components/Countdown.jsx'
import AddToCalendar from '../../components/AddToCalendar.jsx'
import RsvpForm from './RsvpForm.jsx'
import { wedding } from '../../data/wedding.js'

// One full-height, scroll-snapping panel with the recurring logo on top.
function Panel({ children, emblemLink = true }) {
  return (
    <section className="snap-start min-h-[100svh] flex flex-col items-center justify-center px-7 py-16 text-center relative">
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        <Emblem size={48} linkHome={emblemLink} />
      </div>
      {children}
    </section>
  )
}

function mapsDirectionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wedding.venue.mapsQuery)}`
}

export default function Deck() {
  const scroller = useRef(null)
  const [showCue, setShowCue] = useState(true)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => setShowCue(el.scrollTop < 40)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={scroller} className="h-[100svh] overflow-y-scroll snap-y snap-mandatory scroll-gold">
      {/* 1 · Hero */}
      <Panel>
        <p className="label">Evleniyoruz</p>
        <h1 className="font-display italic text-primary text-4xl mt-2 whitespace-nowrap">
          {wedding.bride} <span className="text-gold text-2xl">&amp;</span> {wedding.groom}
        </h1>
        <Sprig width={140} className="my-2" />
        <p className="label mb-3">
          {wedding.dayLabel} · {wedding.dateLabel} · {wedding.timeLabel}
        </p>
        <AddToCalendar />
        <div className="my-6">
          <Countdown targetISO={wedding.dateISO} />
        </div>
        <p className="font-display italic text-primary-soft text-[15px] leading-relaxed max-w-xs">
          “{wedding.quote}”
        </p>
        {showCue && (
          <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center animate-bob">
            <span className="label-gold">Kaydır</span>
            <span className="text-gold text-xl leading-none">⌄</span>
          </div>
        )}
      </Panel>

      {/* 2 · Families + program */}
      <Panel>
        <div className="flex gap-7 justify-center mb-8">
          {wedding.families.map((fam) => (
            <div key={fam.surname} className="text-center">
              <div className="text-rose text-lg">❀</div>
              <div className="font-sans uppercase text-muted whitespace-nowrap mt-2" style={{ letterSpacing: '0.15em', fontSize: '0.53rem' }}>
                {fam.parents}
              </div>
              <div className="font-display text-primary mt-0.5" style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                {fam.surname.toLocaleUpperCase('tr')}
              </div>
            </div>
          ))}
        </div>
        <Sprig width={140} leaves={false} />
        <p className="label mt-7 mb-6">Etkinlik Programı</p>
        <div className="w-full max-w-[16rem] space-y-4">
          {wedding.program.map((p) => (
            <div key={p.title} className="flex items-center gap-3 whitespace-nowrap">
              <span className={p.icon === 'heart' ? 'text-rose' : 'text-gold'}>
                {p.icon === 'heart' ? '♥' : '✦'}
              </span>
              <span className="font-display text-primary text-lg">{p.title}</span>
              <span className="label ml-auto">{p.time}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3 · Location */}
      <Panel>
        <p className="label mb-4">Konum</p>
        <a
          href={mapsDirectionsUrl()}
          target="_blank"
          rel="noreferrer"
          className="block w-full max-w-xs rounded-2xl overflow-hidden border border-[#e2d6b8] relative"
          style={{ height: 180, background: 'linear-gradient(135deg,#eef0e6,#e6e4d4 60%,#e9ddc6)' }}
          aria-label="Haritada aç"
        >
          <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full">
            <g stroke="#cdd2c4" strokeWidth="6" fill="none">
              <path d="M0 55 H200" /><path d="M60 0 V150" /><path d="M0 112 H200" />
            </g>
            <path d="M-5 -5 L210 160" stroke="#d8c79e" strokeWidth="9" fill="none" opacity="0.7" />
            <circle cx="100" cy="58" r="9" fill="#fff" stroke="#b98ca0" strokeWidth="3" />
            <circle cx="100" cy="58" r="3" fill="#b98ca0" />
          </svg>
        </a>
        <h2 className="font-display text-primary text-xl mt-4 tracking-wide">{wedding.venue.name}</h2>
        <p className="font-display text-muted text-[13px] leading-relaxed mt-2 max-w-xs">{wedding.venue.address}</p>
        <a href={mapsDirectionsUrl()} target="_blank" rel="noreferrer" className="btn-lux mt-5">
          Yol Tarifi Al
        </a>
      </Panel>

      {/* 4 · RSVP */}
      <Panel>
        <p className="label mb-2">Katılım Durumu</p>
        <Sprig width={120} leaves={false} className="mb-6" />
        <RsvpForm />
      </Panel>

      {/* 5 · Closing */}
      <Panel>
        <Sprig width={150} />
        <div className="font-script text-primary leading-tight my-5" style={{ fontSize: '2.7rem' }}>
          {wedding.closing}
        </div>
        <Sprig width={110} leaves={false} />
        <p className="label mt-5">
          {wedding.bride} &amp; {wedding.groom}
        </p>
      </Panel>
    </div>
  )
}
