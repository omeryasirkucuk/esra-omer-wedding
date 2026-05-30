import Emblem from '../../components/Emblem.jsx'
import Sprig from '../../components/Sprig.jsx'
import Countdown from '../../components/Countdown.jsx'
import AddToCalendar from '../../components/AddToCalendar.jsx'
import RsvpForm from './RsvpForm.jsx'
import { useSite } from '../../lib/siteContent.jsx'
import venueImage from '../../assets/venue.jpg'

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
      <span className="label-gold" style={{ color: '#8a6d2c' }}>Kaydır</span>
      <span className="text-xl leading-none" style={{ color: '#8a6d2c' }}>⌄</span>
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
    <div data-deck className="h-[100svh] overflow-y-scroll snap-y snap-mandatory scroll-gold">
      {/* 1 · Hero (the deck starts here; the cover illustration lives on the
          entry Cover, so we don't repeat it as a panel) */}
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
          style={{ height: 190 }}
          aria-label="Haritada aç"
        >
          <img
            src={venueImage}
            alt={wedding.venue.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 44%' }}
            loading="lazy"
          />
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
        <button
          type="button"
          onClick={(e) =>
            e.currentTarget.closest('[data-deck]')?.scrollTo({ top: 0, behavior: 'smooth' })
          }
          className="mt-10 flex flex-col items-center gap-0.5"
        >
          <span className="text-xl leading-none" style={{ color: '#8a6d2c' }}>⌃</span>
          <span className="label-gold" style={{ color: '#8a6d2c' }}>En Üste Çık</span>
        </button>
      </Panel>
    </div>
  )
}
