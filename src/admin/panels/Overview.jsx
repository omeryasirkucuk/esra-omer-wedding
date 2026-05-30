// Overview panel: a site open/close switch up top, then a responsive grid of
// headline stats pulled from the /overview endpoint.
import { useEffect, useState } from 'react'
import { getOverview } from '../adminApi'
import SiteGate from './SiteGate'

const CARDS = [
  { key: 'rsvpCount', label: 'Katılım kaydı' },
  { key: 'adults', label: 'Yetişkin' },
  { key: 'children', label: 'Çocuk' },
  { key: 'guestsTotal', label: 'Toplam kişi' },
  { key: 'uploadsTotal', label: 'Yüklenen medya' },
  { key: 'uploadersCount', label: 'Yükleyen kişi' },
  { key: 'postsCount', label: 'Pano gönderisi' },
]

export default function Overview({ onAuthError }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    getOverview()
      .then((d) => alive && setData(d))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [onAuthError])

  return (
    <div className="space-y-6">
      <SiteGate onAuthError={onAuthError} />

      {error && <p className="text-muted text-center py-6">Veriler yüklenemedi.</p>}
      {!error && !data && <p className="text-muted text-center py-6">Yükleniyor…</p>}
      {!error && data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {CARDS.map(({ key, label }) => (
            <div key={key} className="card-soft p-4 sm:p-5 text-center">
              <div className="font-display text-3xl sm:text-4xl text-primary leading-none lining-nums tabular-nums">
                {data[key] ?? 0}
              </div>
              <div className="label mt-2">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
