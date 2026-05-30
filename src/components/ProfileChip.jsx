import { useEffect, useState } from 'react'
import { getProfile } from '../lib/identity.js'
import IdentityPrompt from './IdentityPrompt.jsx'

// Small "👋 {name} · değiştir" chip, rendered once by Layout (fixed top-left,
// opposite the menu button). Tapping "değiştir" lets the guest re-enter their
// name/surname (shared across Album, Anı Panosu and Oyunlar via localStorage).
// Listens for the 'eo-profile' event so it appears/updates the instant the
// profile is set or changed anywhere.
export default function ProfileChip({ onChange, className = '' }) {
  const [profile, setProfile] = useState(() => getProfile())
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const sync = () => setProfile(getProfile())
    window.addEventListener('eo-profile', sync)
    return () => window.removeEventListener('eo-profile', sync)
  }, [])

  if (!profile) return null

  return (
    <>
      {/* Self-fixed at top-left on every page (the menu button is top-right), so
          placement is always consistent and never overlaps the menu. */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`fixed top-4 left-4 z-40 font-sans text-[10px] tracking-[0.12em] text-muted bg-surface/80 border border-line rounded-full px-3 py-1.5 backdrop-blur shadow-sm max-w-[55vw] truncate ${className}`}
      >
        👋 {profile.firstName} · <span className="text-gold">değiştir</span>
      </button>
      {editing && (
        <div className="fixed inset-0 z-[60] paper overflow-y-auto">
          {/* Cancel: close without changing anything (keep current name). */}
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Vazgeç"
            className="fixed top-5 right-6 z-[61] text-2xl text-muted"
          >
            ×
          </button>
          <IdentityPrompt
            title="Adını düzenle"
            submitLabel="Kaydet"
            initialFirst={profile.firstName}
            initialLast={profile.lastName}
            onDone={(p) => {
              setProfile(p)
              setEditing(false)
              if (onChange) onChange(p)
            }}
          />
        </div>
      )}
    </>
  )
}
