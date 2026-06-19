// "QR Oluştur" tab. Two generators — table card and entrance sign — that render
// on-brand printables and export them as high-res PNGs, plus a gallery of every
// poster the couple has saved. Field defaults are seeded from the live site
// content so the names/date/venue are correct out of the box.
import { useEffect, useRef, useState } from 'react'
import { getSiteContent, getQrPosters, getQrContent, saveQrContent } from '../adminApi'
import { wedding } from '../../data/wedding'
import TableCardForm from '../qr/TableCardForm'
import GuestCardForm from '../qr/GuestCardForm'
import EntranceForm from '../qr/EntranceForm'
import SavedPosters from '../qr/SavedPosters'

const POSTER_TABS = [
  { id: 'table', label: 'Masa Kartı' },
  { id: 'guest', label: 'Davetli Kartı' },
  { id: 'entrance', label: 'Giriş Afişi' },
]

// Build the editable-field defaults from a wedding-content object.
function buildDefaults(w) {
  return {
    names: `${w.bride} & ${w.groom}`,
    siteUrl: w?.meta?.siteUrl || 'https://esraomer.com',
    dateLabel: w.dateLabel || '',
    venueName: w?.venue?.name || '',
  }
}

function SectionHeading({ title, count }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-line pb-2 mb-4">
      <h2 className="font-display text-2xl text-gold">{title}</h2>
      {count != null && <p className="label">{count}</p>}
    </div>
  )
}

export default function QrGenerator({ onAuthError }) {
  const [defaults, setDefaults] = useState(null)
  const [content, setContent] = useState(null) // remembered form values per type
  const [posters, setPosters] = useState([])
  const [selected, setSelected] = useState('table')
  const [error, setError] = useState(false)

  // Seed defaults from live site content (fall back to the bundled wedding data),
  // load the remembered form values, and load the saved-poster gallery.
  useEffect(() => {
    let alive = true
    getSiteContent()
      .then((stored) => {
        if (!alive) return
        const merged = {
          ...wedding,
          ...(stored || {}),
          venue: { ...wedding.venue, ...((stored && stored.venue) || {}) },
          meta: { ...wedding.meta, ...((stored && stored.meta) || {}) },
        }
        setDefaults(buildDefaults(merged))
      })
      .catch((e) => {
        if (e.name === 'AuthError') return onAuthError()
        if (alive) setDefaults(buildDefaults(wedding)) // still usable with bundled data
      })

    getQrContent()
      .then((d) => alive && setContent(d || {}))
      .catch((e) => {
        if (e.name === 'AuthError') return onAuthError()
        if (alive) setContent({})
      })

    getQrPosters()
      .then((d) => alive && setPosters(d.posters || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })

    return () => {
      alive = false
    }
  }, [onAuthError])

  const handleSaved = (entry) => setPosters((prev) => [entry, ...prev])
  const handleDeleted = (id) => setPosters((prev) => prev.filter((p) => p.id !== id))

  // Persist remembered form values (debounced so typing doesn't spam the API).
  const saveTimer = useRef(null)
  const handleContentChange = (type, values) => {
    setContent((prev) => {
      const next = { ...(prev || {}), [type]: values }
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveQrContent(next).catch((e) => {
          if (e.name === 'AuthError') onAuthError()
        })
      }, 700)
      return next
    })
  }

  if (!defaults || !content) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div className="space-y-8">
      {/* Generator tabs */}
      <div className="flex gap-2 flex-wrap">
        {POSTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={`font-sans uppercase text-xs tracking-[0.15em] px-4 py-2 rounded-full border transition ${
              selected === t.id
                ? 'border-gold text-primary bg-surface'
                : 'border-line text-muted hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both forms stay mounted so edits survive a tab switch; the inactive one
          is hidden (and never exported). */}
      <div className={selected === 'table' ? '' : 'hidden'}>
        <TableCardForm
          defaults={defaults}
          saved={content.table}
          onChange={(v) => handleContentChange('table', v)}
          onSaved={handleSaved}
          onAuthError={onAuthError}
        />
      </div>
      <div className={selected === 'guest' ? '' : 'hidden'}>
        <GuestCardForm
          defaults={defaults}
          saved={content.guest}
          onChange={(v) => handleContentChange('guest', v)}
          onSaved={handleSaved}
          onAuthError={onAuthError}
        />
      </div>
      <div className={selected === 'entrance' ? '' : 'hidden'}>
        <EntranceForm
          defaults={defaults}
          saved={content.entrance}
          onChange={(v) => handleContentChange('entrance', v)}
          onSaved={handleSaved}
          onAuthError={onAuthError}
        />
      </div>

      {/* Saved gallery */}
      <section className="pt-2">
        <SectionHeading title="Kaydedilenler" count={error ? null : `${posters.length} poster`} />
        {error ? (
          <p className="text-muted text-center py-8">Kayıtlı posterler yüklenemedi.</p>
        ) : (
          <SavedPosters posters={posters} onDelete={handleDeleted} onAuthError={onAuthError} />
        )}
      </section>
    </div>
  )
}
