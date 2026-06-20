// Editor + live preview for the entrance sign. The couple picks a design (the
// classic QR sign, or one of the QR-less decorative welcome signs), tweaks the
// copy, picks the orientation, and exports a high-res PNG that is also saved to
// the gallery.
//
// The photo (classic design only) is held as a local object URL — same-origin
// and full resolution, so html-to-image inlines it cleanly (no S3 cross-origin
// canvas taint). The photo itself isn't persisted; the finished PNG is.
import { useEffect, useRef, useState } from 'react'
import { ENTRANCE_DIMS } from './posters/EntrancePoster'
import { ENTRANCE_DESIGNS, getEntranceDesign } from './posters/entrance-designs'
import PosterStage from './PosterStage'
import DesignPicker from './DesignPicker'
import { TextField, TextAreaField, Segmented } from './Field'
import { usePosterExport } from './usePosterExport'

const DEFAULT_HEADLINE = 'Anılarımıza ortak olun'
const DEFAULT_DESCRIPTION =
  "QR'ı okutun; anılarınızı paylaşın, anı panomuza dilek yazın, biz hazırlanırken oyunların tadını çıkarın."
const DEFAULT_WELCOME = 'HOŞ GELDİNİZ'

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
  const [design, setDesign] = useState(init.design ?? 'classic')
  const [names, setNames] = useState(init.names ?? defaults.names)
  const [qrUrl, setQrUrl] = useState(init.qrUrl ?? defaults.siteUrl)
  const [dateText, setDateText] = useState(init.dateText ?? defaults.dateLabel)
  const [welcome, setWelcome] = useState(init.welcome ?? DEFAULT_WELCOME)
  const [headline, setHeadline] = useState(init.headline ?? DEFAULT_HEADLINE)
  const [description, setDescription] = useState(init.description ?? DEFAULT_DESCRIPTION)
  const [photo, setPhoto] = useState(null) // object URL or null (not persisted)
  const [orientation, setOrientation] = useState(init.orientation ?? 'portrait')

  const active = getEntranceDesign(design)
  const qrless = active.qrless
  const Poster = active.Component

  // Free the object URL when it changes or the form unmounts.
  useEffect(() => {
    if (!photo) return undefined
    return () => URL.revokeObjectURL(photo)
  }, [photo])

  // Remember the fields (skip the initial mount; the photo stays per-session).
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    onChange?.({ design, names, qrUrl, dateText, welcome, headline, description, orientation })
  }, [design, names, qrUrl, dateText, welcome, headline, description, orientation]) // eslint-disable-line react-hooks/exhaustive-deps

  const posterRef = useRef(null)
  const { exporting, exportPoster } = usePosterExport()

  const dims = ENTRANCE_DIMS[orientation]
  const scale = PREVIEW_W / dims.width

  // The shared prop bag every design draws from.
  const posterProps = { names, dateText, welcome, headline, description, qrUrl, photoUrl: photo }

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setPhoto(URL.createObjectURL(file))
  }

  function handleExport() {
    exportPoster(posterRef.current, {
      type: 'entrance',
      label: `Giriş Afişi · ${active.label} — ${names}`,
      fileName: `giris-afisi-${design}-${orientation === 'landscape' ? 'yatay' : 'dikey'}-${fileSlug(names)}.png`,
      pixelRatio: EXPORT_RATIO,
      onSaved,
      onAuthError,
    })
  }

  return (
    <div className="space-y-6">
      <DesignPicker designs={ENTRANCE_DESIGNS} value={design} onChange={setDesign} previewProps={posterProps} />

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

          {qrless ? (
            <TextField label="Karşılama" value={welcome} onChange={setWelcome} placeholder="HOŞ GELDİNİZ" />
          ) : (
            <>
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
            </>
          )}

          <button type="button" className="btn-lux w-full sm:w-auto" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Oluşturuluyor…' : 'PNG İndir ve Kaydet'}
          </button>
        </div>

        {/* Live preview */}
        <div className="order-1 lg:order-2 mx-auto">
          <span className="label block mb-2 text-center">Önizleme</span>
          <PosterStage width={dims.width} scale={scale}>
            <Poster ref={posterRef} {...posterProps} orientation={orientation} />
          </PosterStage>
        </div>
      </div>
    </div>
  )
}
