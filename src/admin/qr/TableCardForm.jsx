// Editor + live preview for the table card. The couple tweaks the copy, picks
// the orientation and the mark (Emblem or camera), and exports a high-res PNG
// that is also saved to the gallery. Defaults are seeded from the live site
// content.
import { useEffect, useRef, useState } from 'react'
import TableCardPoster, { TABLE_DIMS } from './posters/TableCardPoster'
import PosterStage from './PosterStage'
import { TextField, TextAreaField, Segmented } from './Field'
import { usePosterExport } from './usePosterExport'

const DEFAULT_TAGLINE = 'Birlikte güzel anılar biriktirelim'
const DEFAULT_INSTRUCTION =
  "QR'ı okutun; fotoğraf ve videolarınızı paylaşın, anı panomuza yazın, biz hazırlanırken oyunlarla keyifli vakit geçirin."
const DEFAULT_WELCOME = 'HOŞ GELDİNİZ'

const PREVIEW_W = 300 // on-screen preview width target (px)
const EXPORT_RATIO = 6 // base px × 6 → print-ready PNG

// Turkish-aware filename slug.
function fileSlug(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    String(text || 'masa')
      .toLowerCase()
      .replace(/[çğıİöşü]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'masa'
  )
}

export default function TableCardForm({ defaults, saved, onChange, onSaved, onAuthError }) {
  const init = saved || {}
  const [names, setNames] = useState(init.names ?? defaults.names)
  const [qrUrl, setQrUrl] = useState(init.qrUrl ?? defaults.siteUrl)
  const [tagline, setTagline] = useState(init.tagline ?? DEFAULT_TAGLINE)
  const [instruction, setInstruction] = useState(init.instruction ?? DEFAULT_INSTRUCTION)
  const [welcome, setWelcome] = useState(init.welcome ?? DEFAULT_WELCOME)
  const [mark, setMark] = useState(init.mark ?? 'emblem')
  const [orientation, setOrientation] = useState(init.orientation ?? 'portrait')

  // Remember edits (skip the initial mount so we don't re-save the seed values).
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    onChange?.({ names, qrUrl, tagline, instruction, welcome, mark, orientation })
  }, [names, qrUrl, tagline, instruction, welcome, mark, orientation]) // eslint-disable-line react-hooks/exhaustive-deps

  const posterRef = useRef(null)
  const { exporting, exportPoster } = usePosterExport()

  const dims = TABLE_DIMS[orientation]
  const scale = PREVIEW_W / dims.width

  function handleExport() {
    exportPoster(posterRef.current, {
      type: 'table',
      label: `Masa Kartı — ${names}`,
      fileName: `masa-karti-${orientation === 'landscape' ? 'yatay' : 'dikey'}-${fileSlug(names)}.png`,
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
        <TextField label="QR adresi" value={qrUrl} onChange={setQrUrl} placeholder="https://esraomer.com" />
        <TextAreaField label="Üst yazı" value={tagline} onChange={setTagline} rows={2} />
        <TextAreaField label="Açıklama" value={instruction} onChange={setInstruction} rows={3} />
        <TextField label="Alt yazı" value={welcome} onChange={setWelcome} />
        <Segmented
          label="İşaret"
          value={mark}
          onChange={setMark}
          options={[
            { id: 'emblem', label: 'Amblem' },
            { id: 'camera', label: 'Kamera' },
          ]}
        />

        <button type="button" className="btn-lux w-full sm:w-auto" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Oluşturuluyor…' : 'PNG İndir ve Kaydet'}
        </button>
      </div>

      {/* Live preview */}
      <div className="order-1 lg:order-2 mx-auto">
        <span className="label block mb-2 text-center">Önizleme</span>
        <PosterStage width={dims.width} scale={scale}>
          <TableCardPoster
            ref={posterRef}
            names={names}
            tagline={tagline}
            instruction={instruction}
            welcome={welcome}
            qrUrl={qrUrl}
            mark={mark}
            orientation={orientation}
          />
        </PosterStage>
      </div>
    </div>
  )
}
