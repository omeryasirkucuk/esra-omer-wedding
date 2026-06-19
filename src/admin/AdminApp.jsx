// Admin dashboard root. Renders a login gate until a valid session token is
// stored, then a shell with a top bar and tab navigation. Any 401 from a child
// panel bubbles up through onAuthError and drops the whole app back to login.
import { useCallback, useState } from 'react'
import Emblem from '../components/Emblem'
import { login, logout, isAuthed } from './adminApi'
import { useCoupleNames } from './useCoupleNames'
import Overview from './panels/Overview'
import SiteEditor from './panels/SiteEditor'
import Rsvps from './panels/Rsvps'
import Albums from './panels/Albums'
import Posts from './panels/Posts'
import GamesEditor from './panels/GamesEditor'
import Scores from './panels/Scores'
import QrGenerator from './panels/QrGenerator'
import SystemPanel from './panels/SystemPanel'

// Link back to the guest site. On admin.esraomer.com this strips the "admin."
// subdomain; locally (where admin loads under /admin) it just points to "/".
function guestHomeHref() {
  const { protocol, hostname, port } = window.location
  if (hostname.startsWith('admin.')) {
    const host = hostname.replace(/^admin\./, '')
    return `${protocol}//${host}${port ? `:${port}` : ''}/`
  }
  return '/'
}

const TABS = [
  { id: 'overview', label: 'Özet', Panel: Overview },
  { id: 'site', label: 'Düğün Bilgileri', Panel: SiteEditor },
  { id: 'rsvps', label: 'Katılımcılar', Panel: Rsvps },
  { id: 'albums', label: 'Albüm', Panel: Albums },
  { id: 'posts', label: 'Pano', Panel: Posts },
  { id: 'games', label: 'Oyunlar', Panel: GamesEditor },
  { id: 'scores', label: 'Skorlar', Panel: Scores },
  { id: 'qr', label: 'QR Oluştur', Panel: QrGenerator },
  { id: 'system', label: 'Sistem', Panel: SystemPanel },
]

export default function AdminApp() {
  const [authed, setAuthed] = useState(isAuthed())

  // Shared handler so any panel can force a return to login on a stale token.
  const handleAuthError = useCallback(() => {
    logout()
    setAuthed(false)
  }, [])

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return <Dashboard onAuthError={handleAuthError} />
}

function LoginScreen({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(false)
    setBusy(true)
    try {
      await login(username.trim(), password)
      onSuccess()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="paper min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card-soft w-full max-w-sm p-7 sm:p-8 text-center">
        <Emblem className="w-12 mx-auto" />
        <h1 className="font-display text-3xl text-primary mt-3 mb-6">Yönetim</h1>

        <div className="space-y-3 text-left">
          <label className="block">
            <span className="label">Kullanıcı adı</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="label">Parola</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold"
            />
          </label>
        </div>

        {error && <p className="text-rose text-sm mt-3">Hatalı giriş</p>}

        <button type="submit" className="btn-lux w-full mt-6" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş'}
        </button>
        <a href={guestHomeHref()} className="block mt-4 label-gold no-underline">
          ‹ Ana Sayfa
        </a>
      </form>
    </div>
  )
}

function Dashboard({ onAuthError }) {
  const { bride, groom } = useCoupleNames()
  const [active, setActive] = useState('overview')
  const ActivePanel = TABS.find((t) => t.id === active).Panel

  return (
    <div className="paper min-h-screen overflow-x-hidden">
      {/* Top bar — wraps to a second row on narrow screens so nothing is cut. */}
      <header className="border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-20">
        <div className="w-full max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Emblem className="w-9 sm:w-10 md:w-12 shrink-0" />
          {/* Compact title under sm, full brand from sm up. */}
          <span className="font-display text-lg sm:text-xl text-primary flex-1 min-w-0 truncate">
            <span className="sm:hidden">Yönetim</span>
            <span className="hidden sm:inline">{bride} &amp; {groom} · Yönetim</span>
          </span>
          <a
            href={guestHomeHref()}
            className="btn-lux no-underline text-[0.7rem] px-3 py-1.5 sm:text-xs sm:px-4 sm:py-2 shrink-0"
          >
            Ana Sayfa
          </a>
          <button
            type="button"
            className="btn-lux text-[0.7rem] px-3 py-1.5 sm:text-xs sm:px-4 sm:py-2 shrink-0"
            onClick={onAuthError}
          >
            Çıkış
          </button>
        </div>

        {/* Tab bar — single clean underline (container hairline) with the active
            tab marked by gold text + a short inset indicator that doesn't clash
            with the border. Smooth horizontal scroll, first tab not clipped. */}
        <nav
          className="w-full max-w-5xl mx-auto border-b border-line overflow-x-auto scroll-gold"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex gap-1 px-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`relative font-sans uppercase text-xs tracking-[0.18em] px-3 sm:px-4 py-3 whitespace-nowrap transition ${
                  active === t.id
                    ? 'text-gold after:absolute after:left-3 after:right-3 sm:after:left-4 sm:after:right-4 after:-bottom-px after:h-0.5 after:bg-gold after:rounded'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <ActivePanel onAuthError={onAuthError} />
      </main>
    </div>
  )
}
