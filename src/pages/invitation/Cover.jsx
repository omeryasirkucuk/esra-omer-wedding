import { motion } from 'framer-motion'
import { wedding } from '../../data/wedding.js'

// Full-screen entry cover. Tapping "Davetiyeyi Aç" opens the invitation and,
// because it is a user gesture, is also what allows the music to start.
export default function Cover({ onOpen }) {
  return (
    <motion.section
      className="fixed inset-0 z-10 flex flex-col items-center justify-between px-7 py-10 paper text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.6 }}
    >
      {/* double gold inner frame */}
      <div className="pointer-events-none absolute inset-3 rounded-2xl border border-line">
        <div className="absolute inset-1.5 rounded-2xl border border-[#cdb06a30]" />
      </div>

      {/* watercolour arch + couple + cat */}
      <div className="relative flex-1 w-full max-w-xs mt-2 rounded-2xl overflow-hidden"
           style={{ background: 'radial-gradient(120% 90% at 50% 100%, #dfe6dd, #eef0e6 55%, #f4ecdd)' }}>
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <path d="M40 200 Q42 120 70 70 Q100 30 130 70 Q158 120 160 200" fill="none" stroke="#8a9a7b" strokeWidth="1.4" opacity="0.75" />
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
            <path d="M138 198 C130 198 130 183 134 177 C136 173 142 173 144 177 C148 183 148 198 140 198 Z" />
            <circle cx="139" cy="173" r="5.6" />
            <path d="M134.4 170 L133 162 L139.2 167.5 Z" /><path d="M143.6 170 L145 162 L138.8 167.5 Z" />
            <path d="M131 197 C123 196 125 187 132 188.5" fill="none" stroke="#5b5048" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </svg>
        <span className="label absolute bottom-2 right-3">birileri · aynı yer</span>
      </div>

      <div className="relative">
        <div className="font-script text-primary leading-none whitespace-nowrap" style={{ fontSize: '2.6rem' }}>
          {wedding.bride} &amp; {wedding.groom}
        </div>
        <div className="flex items-center gap-2 justify-center my-3">
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
          <span className="text-gold text-[9px]">✦</span>
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg,transparent,#c2a25c,transparent)' }} />
        </div>
        <div className="label">
          {wedding.dateLabel} · {wedding.dayLabel} · {wedding.timeLabel}
        </div>
        <button onClick={onOpen} className="btn-lux mt-6">
          Davetiyeyi Aç
        </button>
      </div>
    </motion.section>
  )
}
