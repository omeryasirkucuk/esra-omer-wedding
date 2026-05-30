// Site open/close switch shown at the top of the Overview panel. When closed,
// the guest site shows only the invitation; every other route redirects there
// and the nav menu is hidden. The couple flips this on for the wedding day.
import { useEffect, useState } from 'react'
import { getSiteContent, setSiteOpen, AuthError } from '../adminApi'

export default function SiteGate({ onAuthError }) {
  const [open, setOpen] = useState(null) // null while loading
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getSiteContent()
      .then((c) => alive && setOpen(Boolean(c?.siteOpen)))
      .catch((e) => {
        if (e instanceof AuthError) onAuthError()
        else if (alive) setError('Durum okunamadı')
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  async function toggle() {
    if (busy || open === null) return
    const next = !open
    setBusy(true)
    setError('')
    try {
      await setSiteOpen(next)
      setOpen(next)
    } catch (e) {
      if (e instanceof AuthError) onAuthError()
      else setError('Değiştirilemedi, tekrar deneyin')
    } finally {
      setBusy(false)
    }
  }

  const loading = open === null

  return (
    <div className="card-soft p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="flex-1">
        <div className="label">Site durumu</div>
        <div className="font-display text-2xl sm:text-3xl text-primary mt-1">
          {loading ? '…' : open ? 'Tüm sayfalar açık' : 'Sadece davetiye açık'}
        </div>
        <p className="text-muted text-sm mt-1 max-w-md">
          {open
            ? 'Anı Panosu, Oyunlar ve Albüm misafirlere açık.'
            : 'Düğün günü açana kadar misafirler yalnızca davetiyeyi görür.'}
        </p>
        {error && <p className="text-rose text-sm mt-2">{error}</p>}
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy || loading}
        role="switch"
        aria-checked={!!open}
        aria-label="Site açık/kapalı"
        className="relative w-16 h-9 rounded-full border border-line transition-colors disabled:opacity-50 shrink-0"
        style={{ background: open ? 'var(--c-gold)' : '#cdc6b4' }}
      >
        <span
          className="absolute top-1 left-1 w-7 h-7 rounded-full bg-surface shadow transition-transform"
          style={{ transform: open ? 'translateX(28px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
