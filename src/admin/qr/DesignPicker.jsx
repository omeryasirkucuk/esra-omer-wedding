// Thumbnail strip for choosing an entrance-sign design. Each chip is a live
// miniature of the real poster (rendered with `thumb` so the costly watercolor
// displacement is skipped), so the couple picks by sight, not by name. The big
// preview and export still use the full-fidelity render.
import PosterStage from './PosterStage'
import { ENTRANCE_DIMS } from './posters/EntrancePoster'

const THUMB_W = 74

export default function DesignPicker({ designs, value, onChange, previewProps }) {
  const dims = ENTRANCE_DIMS.portrait
  const scale = THUMB_W / dims.width

  return (
    <div>
      <span className="label">Tasarım</span>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {designs.map((d) => {
          const active = d.id === value
          const Poster = d.Component
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange(d.id)}
              className="shrink-0 flex flex-col items-center gap-1.5 group"
              title={d.label}
            >
              <span
                className={`block rounded-sm overflow-hidden transition ring-offset-2 ring-offset-bg ${
                  active ? 'ring-2 ring-gold' : 'ring-1 ring-line group-hover:ring-primary-soft'
                }`}
              >
                <PosterStage width={dims.width} scale={scale}>
                  <Poster {...previewProps} orientation="portrait" thumb />
                </PosterStage>
              </span>
              <span
                className={`font-sans text-[10px] tracking-[0.12em] uppercase whitespace-nowrap transition ${
                  active ? 'text-primary' : 'text-muted group-hover:text-primary'
                }`}
              >
                {d.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
