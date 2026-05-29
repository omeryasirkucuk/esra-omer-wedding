import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Menu from './Menu.jsx'

// App shell: a fixed menu trigger on every page plus the cinematic, soft
// route transition (gentle fade + scale) the design calls for. Music lives
// only inside the invitation page, never here.
export default function Layout() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen paper">
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Menü"
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full border border-line bg-surface/70 backdrop-blur flex flex-col items-center justify-center gap-[3px]"
      >
        <span className="block w-4 h-px bg-primary" />
        <span className="block w-4 h-px bg-primary" />
        <span className="block w-4 h-px bg-primary" />
      </button>

      <AnimatePresence>{menuOpen && <Menu onClose={() => setMenuOpen(false)} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.992 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
