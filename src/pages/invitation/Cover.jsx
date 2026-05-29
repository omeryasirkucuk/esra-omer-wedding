import { useSite } from '../../lib/siteContent.jsx'

// Shown only on a DIRECT visit to /davetiye (when the music wasn't already
// unlocked by the home "Davetiye" tap). Tapping anywhere starts the music in a
// real user gesture — the one reliable way browsers allow audio — and opens the
// invitation. From the QR/home flow this never appears.
export default function Cover({ onOpen }) {
  const w = useSite()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Davetiyeyi aç"
      className="relative min-h-[100svh] w-full paper flex flex-col items-center justify-center px-7 text-center"
    >
      <div className="pointer-events-none absolute inset-3 rounded-2xl border border-line">
        <div className="absolute inset-1.5 rounded-2xl border border-[#cdb06a30]" />
      </div>

      <div className="w-full max-w-[230px] md:max-w-[300px]">
        <svg viewBox="0 0 200 210" className="w-full h-auto" aria-hidden="true">
          <path d="M40 200 Q42 120 70 70 Q100 30 130 70 Q158 120 160 200" fill="none" stroke="#8a9a7b" strokeWidth="1.4" opacity="0.7" />
          <g fill="#b98ca0" opacity="0.8">
            <circle className="eo-flower" cx="70" cy="74" r="6" /><circle className="eo-flower" cx="80" cy="66" r="5" /><circle className="eo-flower" cx="62" cy="68" r="4.5" />
            <circle className="eo-flower" cx="128" cy="76" r="6" /><circle className="eo-flower" cx="120" cy="66" r="5" /><circle className="eo-flower" cx="136" cy="70" r="4.5" />
          </g>

          {/* drifting rose petals (showpiece) */}
          <g fill="#c2a0b0">
            <ellipse className="eo-petal" cx="82" cy="58" rx="2.6" ry="4" style={{ '--eo-drift': '-16px', animationDelay: '0s', animationDuration: '6s' }} />
            <ellipse className="eo-petal" cx="100" cy="46" rx="2.2" ry="3.4" style={{ '--eo-drift': '12px', animationDelay: '1.5s', animationDuration: '7.2s' }} />
            <ellipse className="eo-petal" cx="118" cy="56" rx="2.8" ry="4.2" style={{ '--eo-drift': '20px', animationDelay: '2.8s', animationDuration: '6.4s' }} />
            <ellipse className="eo-petal" cx="92" cy="66" rx="2.1" ry="3.2" style={{ '--eo-drift': '-9px', animationDelay: '3.8s', animationDuration: '7.6s' }} />
            <ellipse className="eo-petal" cx="110" cy="62" rx="2.5" ry="3.8" style={{ '--eo-drift': '24px', animationDelay: '5s', animationDuration: '6.8s' }} />
          </g>

          {/* gold sparkles near the arch crown */}
          <g fill="#c2a25c">
            <circle className="eo-sparkle" cx="100" cy="40" r="1.7" style={{ animationDelay: '0.2s' }} />
            <circle className="eo-sparkle" cx="83" cy="50" r="1.3" style={{ animationDelay: '1.2s' }} />
            <circle className="eo-sparkle" cx="117" cy="50" r="1.3" style={{ animationDelay: '2s' }} />
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
          <g className="eo-cat" fill="#5b5048">
            <path d="M138 200 C130 200 130 185 134 179 C136 175 142 175 144 179 C148 185 148 200 140 200 Z" />
            <circle cx="139" cy="175" r="5.6" />
            <path d="M134.4 172 L133 164 L139.2 169.5 Z" /><path d="M143.6 172 L145 164 L138.8 169.5 Z" />
            <path className="eo-tail" d="M131 199 C123 198 125 189 132 190.5" fill="none" stroke="#5b5048" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      <div className="font-script text-primary leading-none mt-4 whitespace-nowrap text-5xl md:text-6xl">
        {w.bride} &amp; {w.groom}
      </div>
      <div className="flex items-center gap-2 justify-center my-3">
        <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
        <span className="text-gold text-[9px]">✦</span>
        <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
      </div>
      <div className="label">
        {w.dateLabel} · {w.dayLabel} · {w.timeLabel}
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center animate-bob">
        <span className="label-gold">Davetiyeyi açmak için dokunun</span>
      </div>
    </button>
  )
}
