// Editor + live preview for the entrance sign. The couple tweaks the copy, picks
// the orientation, and optionally uploads a photo (default is the Emblem), then
// exports a high-res PNG that is also saved to the gallery.
//
// The photo is held as a local object URL — same-origin and full resolution, so
// html-to-image inlines it cleanly (no S3 cross-origin canvas taint). The photo
// itself isn't persisted; the finished PNG (with the photo baked in) is.
import { useEffect, useRef, useState } from 'react'
import EntrancePoster, { ENTRANCE_DIMS } from './posters/EntrancePoster'
import PosterStage from './PosterStage'
import { TextField, TextAreaField, Segmented } from './Field'
import { usePosterExport } from './usePosterExport'

const DEFAULT_HEADLINE = 'Anılarımıza ortak olun'
const DEFAULT_DESCRIPTION =
  "QR'ı okutun; anılarınızı paylaşın, anı panomuza dilek yazın, biz hazırlanırken oyunların tadını çıkarın."

const PREVIEW_W = 300
const EXPORT_RATIO = 7 // larger sign → push resolution higher for 70×100 prints

function fileSlug(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    String(text || 'giris')
      .toLowerCase()
      .replace(/[çğıİöşü]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'giris'
  )
}

export default function EntranceForm({ defaults, saved, onChange, onSaved, onAuthError }) {
  const init = saved || {}
  const [names, setNames] = useState(init.names ?? defaults.names)
  const [qrUrl, setQrUrl] = useState(init.qrUrl ?? defaults.siteUrl)
  const [dateText, setDateText] = useState(init.dateText ?? defaults.dateLabel)
  const [headline, setHeadline] = useState(init.headline ?? DEFAULT_HEADLINE)
  const [description, setDescription] = useState(init.description ?? DEFAULT_DESCRIPTION)
  const [photo, setPhoto] = useState(null) // object URL or null (not persisted)
  const [orientation, setOrientation] = useState(init.orientation ?? 'portrait')

  // Free the object URL when it changes or the form unmounts.
  useEffect(() => {
    if (!photo) return undefined
    return () => URL.revokeObjectURL(photo)
  }, [photo])

  // Remember the text fields (skip the initial mount; the photo stays per-session).
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    onChange?.({ names, qrUrl, dateText, headline, description, orientation })
  }, [names, qrUrl, dateText, headline, description, orientation]) // eslint-disable-line react-hooks/exhaustive-deps

  const posterRef = useRef(null)
  const { exporting, exportPoster } = usePosterExport()

  const dims = ENTRANCE_DIMS[orientation]
  const scale = PREVIEW_W / dims.width

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setPhoto(URL.createObjectURL(file))
  }

  function handleExport() {
    exportPoster(posterRef.current, {
      type: 'entrance',
      label: `Giriş Afişi — ${names}`,
      fileName: `giris-afisi-${orientation === 'landscape' ? 'yatay' : 'dikey'}-${fileSlug(names)}.png`,
      pixelRatio: EXPORT_RATIO,
      onSaved,
      onAuthError,
    })
  }

  return (
    <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
      {/* Inputs */}
      <div className="space-y-4 order-2 lg:order-1">
        <Segmented
          label="Yön"
          value={orientation}
          onChange={setOrientation}
          options={[
            { id: 'portrait', label: 'Dikey' },
            { id: 'landscape', label: 'Yatay' },
          ]}
        />
        <TextField label="İsimler" value={names} onChange={setNames} placeholder="Esra & Ömer" />
        <TextField label="Tarih" value={dateText} onChange={setDateText} placeholder="17 Temmuz 2026" />
        <TextField label="QR adresi" value={qrUrl} onChange={setQrUrl} placeholder="https://esraomer.com" />
        <TextAreaField label="Başlık" value={headline} onChange={setHeadline} rows={2} />
        <TextAreaField label="Açıklama" value={description} onChange={setDescription} rows={2} />

        <div>
          <span className="label">Fotoğraf</span>
          <p className="text-muted text-sm mt-1 mb-2">
            Varsayılan amblemdir. İsterseniz bir fotoğraf yükleyin.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-lux cursor-pointer text-center">
              {photo ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-sm text-primary-soft hover:text-primary transition"
              >
                Ambleme dön
              </button>
            )}
          </div>
        </div>

        <button type="button" className="btn-lux w-full sm:w-auto" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Oluşturuluyor…' : 'PNG İndir ve Kaydet'}
        </button>
      </div>

      {/* Live preview */}
      <div className="order-1 lg:order-2 mx-auto">
        <span className="label block mb-2 text-center">Önizleme</span>
        <PosterStage width={dims.width} scale={scale}>
          <EntrancePoster
            ref={posterRef}
            names={names}
            eyebrow={dateText}
            headline={headline}
            description={description}
            qrUrl={qrUrl}
            photoUrl={photo}
            orientation={orientation}
          />
        </PosterStage>
      </div>
    </div>
  )
}
