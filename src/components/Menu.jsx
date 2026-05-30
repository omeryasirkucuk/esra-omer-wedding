import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Emblem from './Emblem.jsx'

const LINKS = [
  { label: 'Ana Sayfa', to: '/' },
  { label: 'Davetiye', to: '/davetiye' },
  { label: 'Anı Panosu', to: '/pano' },
  { label: 'Oyunlar', to: '/oyunlar' },
  { label: 'Albüm', to: '/album' },
]

// Full-screen navigation overlay. No music control anywhere by design.
export default function Menu({ onClose }) {
  const navigate = useNavigate()
  const go = (to) => {
    onClose()
    navigate(to)
  }
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg,#34465a,#3f5871)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <button
        onClick={onClose}
        aria-label="Kapat"
        className="absolute top-5 right-6 text-2xl text-[#cdd2c4]"
      >
        ×
      </button>
      <button
        type="button"
        onClick={() => go('/')}
        aria-label="Ana sayfa"
        className="mb-2 opacity-90"
      >
        <Emblem size={56} tone="light" />
      </button>
      <div
        lang="en"
        className="font-sans uppercase tracking-[0.3em] text-[11px] text-[#cdd2c4] mb-6"
      >
        Esra &amp; Ömer Wedding
      </div>
      {LINKS.map((l, i) => (
        <motion.button
          key={l.to}
          onClick={() => go(l.to)}
          className="font-display text-[1.55rem] tracking-wide text-[#fbf7ee] my-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.05 }}
        >
          {l.label}
        </motion.button>
      ))}
    </motion.div>
  )
}
