import { useState } from 'react'
import { getProfile } from '../lib/identity.js'
import IdentityPrompt from './IdentityPrompt.jsx'

// Small "👋 {name} · değiştir" chip. Tapping "değiştir" lets the guest re-enter
// their name/surname (shared across Album, Anı Panosu and Oyunlar via
// localStorage). Self-contained: shows the IdentityPrompt as an overlay and
// reports the new profile via onChange.
export default function ProfileChip({ onChange, className = '' }) {
  const [profile, setProfile] = useState(() => getProfile())
  const [editing, setEditing] = useState(false)
  if (!profile) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`font-sans text-[10px] tracking-[0.12em] text-muted bg-surface/70 border border-line rounded-full px-3 py-1 backdrop-blur ${className}`}
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
