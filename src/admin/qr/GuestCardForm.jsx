// Editor + live preview for the guest/table-group card (no QR). The couple sets
// the group label (the big focal text, e.g. "P&G"), picks the orientation, and
// exports a high-res PNG saved to the gallery.
import { useEffect, useRef, useState } from 'react'
import GuestCardPoster, { GUEST_DIMS } from './posters/GuestCardPoster'
import PosterStage from './PosterStage'
import { TextField, Segmented } from './Field'
import { usePosterExport } from './usePosterExport'
import ExportButtons from './ExportButtons'

const DEFAULT_WELCOME = 'HOŞ GELDİNİZ'
const DEFAULT_GROUP = 'Aile'

const PREVIEW_W = 300
const EXPORT_RATIO = 6

function fileSlug(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    String(text || 'davetli')
      .toLowerCase()
      .replace(/[çğıİöşü]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'davetli'
  )
}

export default function GuestCardForm({ defaults, saved, onChange, onSaved, onAuthError }) {
  const init = saved || {}
  const [names, setNames] = useState(init.names ?? defaults.names)
  const [welcome, setWelcome] = useState(init.welcome ?? DEFAULT_WELCOME)
  const [group, setGroup] = useState(init.group ?? DEFAULT_GROUP)
  const [orientation, setOrientation] = useState(init.orientation ?? 'portrait')

  // Remember edits (skip the initial mount so we don't re-save the seed values).
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    onChange?.({ names, welcome, group, orientation })
  }, [names, welcome, group, orientation]) // eslint-disable-line react-hooks/exhaustive-deps

  const posterRef = useRef(null)
  const { exporting, exportPoster } = usePosterExport()

  const dims = GUEST_DIMS[orientation]
  const scale = PREVIEW_W / dims.width

  function handleExport(format) {
    exportPoster(posterRef.current, {
      type: 'guest',
      label: `Davetli Kartı — ${group}`,
      fileName: `davetli-karti-${orientation === 'landscape' ? 'yatay' : 'dikey'}-${fileSlug(group)}.png`,
      pixelRatio: EXPORT_RATIO,
      format,
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
        <TextField label="Alt yazı" value={welcome} onChange={setWelcome} />
        <TextField label="Masa / grup adı" value={group} onChange={setGroup} placeholder="Örn. P&G, Üniversite, Aile" />

        <ExportButtons exporting={exporting} onExport={handleExport} />
      </div>

      {/* Live preview */}
      <div className="order-1 lg:order-2 mx-auto">
        <span className="label block mb-2 text-center">Önizleme</span>
        <PosterStage width={dims.width} scale={scale}>
          <GuestCardPoster
            ref={posterRef}
            names={names}
            welcome={welcome}
            group={group}
            orientation={orientation}
          />
        </PosterStage>
      </div>
    </div>
  )
}
