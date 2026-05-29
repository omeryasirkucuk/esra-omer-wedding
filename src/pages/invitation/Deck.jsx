import Emblem from '../../components/Emblem.jsx'
import Sprig from '../../components/Sprig.jsx'
import Countdown from '../../components/Countdown.jsx'
import AddToCalendar from '../../components/AddToCalendar.jsx'
import RsvpForm from './RsvpForm.jsx'
import { useSite } from '../../lib/siteContent.jsx'

// Scroll to the next snap panel. Used by every "Kaydır" cue.
function goNext(e) {
  e.currentTarget.closest('section')?.nextElementSibling?.scrollIntoView({ behavior: 'smooth' })
}

// Animated, tappable "Kaydır" hint shown at the bottom of every panel but the
// last — guests always know there is more below, and tapping advances a panel.
function ScrollCue() {
  return (
    <button
      type="button"
      onClick={goNext}
      aria-label="Aşağı kaydır"
      className="absolute bottom-5 left-0 right-0 flex flex-col items-center animate-bob"
    >
      <span className="label-gold">Kaydır</span>
      <span className="text-gold text-xl leading-none">⌄</span>
    </button>
  )
}

// One full-height, scroll-snapping panel with the recurring logo on top.
function Panel({ children, emblem = true, cue = true }) {
  return (
    <section className="snap-start min-h-[100svh] flex flex-col items-center justify-center px-7 py-20 text-center relative">
      {emblem && (
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <Emblem className="w-11 md:w-14" linkHome />
        </div>
      )}
      {children}
      {cue && <ScrollCue />}
    </section>
  )
}

function mapsDirectionsUrl(wedding) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wedding.venue.mapsQuery)}`
}

export default function Deck() {
  const wedding = useSite()
  return (
    <div className="h-[100svh] overflow-y-scroll snap-y snap-mandatory scroll-gold">
      {/* 0 · Cover — illustration blends into the ivory background, no hard box */}
      <Panel emblem={false}>
        <div className="w-full max-w-[260px] md:max-w-[320px] mx-auto">
          <svg viewBox="0 0 200 210" className="w-full h-auto" aria-hidden="true">
            <path d="M40 200 Q42 120 70 70 Q100 30 130 70 Q158 120 160 200" fill="none" stroke="#8a9a7b" strokeWidth="1.4" opacity="0.7" />
            <g fill="#b98ca0" opacity="0.8">
              <circle cx="70" cy="74" r="6" /><circle cx="80" cy="66" r="5" /><circle cx="62" cy="68" r="4.5" />
              <circle cx="128" cy="76" r="6" /><circle cx="120" cy="66" r="5" /><circle cx="136" cy="70" r="4.5" />
            </g>
            <g fill="#8a9a7b" opacity="0.85">
              <ellipse cx="92" cy="60" rx="4" ry="9" transform="rotate(-25 92 60)" />
              <ellipse cx="110" cy="60" rx="4" ry="9" transform="rotate(25 110 60)" />
            </g>
            <g fill="#5b5048" opacity="0.88">
              <path d="M92 200 L92 150 Q92 140 98 138 L98 200 Z" />
              <path d="M108 200 L108 150 Q108 138 101 138 L101 200 Z" />
              <circle cx="95" cy="132" r="6" /><circle cx="105" cy="132" r="6" />
            </g>
            <g fill="#5b5048">
              <path d="M138 200 C130 200 130 185 134 179 C136 175 142 175 144 179 C148 185 148 200 140 200 Z" />
              <circle cx="139" cy="175" r="5.6" />
              <path d="M134.4 172 L133 164 L139.2 169.5 Z" /><path d="M143.6 172 L145 164 L138.8 169.5 Z" />
              <path d="M131 199 C123 198 125 189 132 190.5" fill="none" stroke="#5b5048" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          </svg>
        </div>
        <h1 className="font-script text-primary leading-none mt-4 whitespace-nowrap text-5xl md:text-6xl">
          {wedding.bride} &amp; {wedding.groom}
        </h1>
        <div className="flex items-center gap-2 justify-center my-3">
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
          <span className="text-gold text-[9px]">✦</span>
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
        </div>
        <p className="label">
          {wedding.dateLabel} · {wedding.dayLabel} · {wedding.timeLabel}
        </p>
      </Panel>

      {/* 1 · Hero */}
      <Panel>
        <p className="label">Evleniyoruz</p>
        <h2 className="font-display italic text-primary mt-2 whitespace-nowrap text-4xl md:text-5xl">
          {wedding.bride} <span className="text-gold text-2xl md:text-3xl">&amp;</span> {wedding.groom}
        </h2>
        <Sprig width={150} className="my-2" />
        <p className="label mb-3">
          {wedding.dayLabel} · {wedding.dateLabel} · {wedding.timeLabel}
        </p>
        <AddToCalendar />
        <div className="my-6">
          <Countdown targetISO={wedding.dateISO} />
        </div>
        <p className="font-display italic text-primary-soft text-base md:text-lg leading-relaxed max-w-sm">
          “{wedding.quote}”
        </p>
      </Panel>

      {/* 2 · Families + program */}
      <Panel>
        <div className="flex gap-8 md:gap-12 justify-center mb-9">
          {wedding.families.map((fam) => (
            <div key={fam.surname} className="text-center">
              <div className="text-rose text-lg">❀</div>
              <div className="font-sans uppercase text-muted whitespace-nowrap mt-3 text-[0.72rem] md:text-sm" style={{ letterSpacing: '0.12em' }}>
                {fam.parents}
              </div>
              <div className="font-display text-primary mt-1 text-lg md:text-xl" style={{ letterSpacing: '0.08em' }}>
                {fam.surname.toLocaleUpperCase('tr')}
              </div>
            </div>
          ))}
        </div>
        <Sprig width={150} leaves={false} />
        <p className="label mt-8 mb-6">Etkinlik Programı</p>
        <div className="w-full max-w-xs space-y-4">
          {wedding.program.map((p) => (
            <div key={p.title} className="flex items-center gap-3 whitespace-nowrap">
              <span className={p.icon === 'heart' ? 'text-rose' : 'text-gold'}>
                {p.icon === 'heart' ? '♥' : '✦'}
              </span>
              <span className="font-display text-primary text-lg md:text-xl">{p.title}</span>
              <span className="label ml-auto">{p.time}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3 · Location */}
      <Panel>
        <p className="label mb-4">Konum</p>
        <a
          href={mapsDirectionsUrl(wedding)}
          target="_blank"
          rel="noreferrer"
          className="block w-full max-w-xs md:max-w-sm rounded-2xl overflow-hidden border border-[#e2d6b8] relative"
          style={{ height: 190, background: 'linear-gradient(135deg,#eef0e6,#e6e4d4 60%,#e9ddc6)' }}
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
        <h2 className="font-display text-primary text-xl md:text-2xl mt-4 tracking-wide">{wedding.venue.name}</h2>
        <p className="font-display text-muted text-sm md:text-base leading-relaxed mt-2 max-w-xs md:max-w-sm">{wedding.venue.address}</p>
        <a href={mapsDirectionsUrl(wedding)} target="_blank" rel="noreferrer" className="btn-lux mt-5">
          Yol Tarifi Al
        </a>
      </Panel>

      {/* 4 · RSVP */}
      <Panel>
        <p className="label mb-2">Katılım Durumu</p>
        <Sprig width={120} leaves={false} className="mb-6" />
        <RsvpForm />
      </Panel>

      {/* 5 · Closing (no cue — last panel) */}
      <Panel cue={false}>
        <Sprig width={150} />
        <div className="font-script text-primary leading-tight my-5 text-5xl md:text-6xl">
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
