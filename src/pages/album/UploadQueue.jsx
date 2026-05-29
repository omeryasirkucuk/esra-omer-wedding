// The live upload queue: one row per selected file with a thumbnail,
// filename, progress bar and a done check. Built to stay smooth even when the
// guest queues hundreds of files — object URLs are created only for image
// previews and revoked once the row unmounts; videos use a static tile.
import { useEffect, useState } from 'react'

function ImageThumb({ file }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <div className="w-9 h-9 md:w-11 md:h-11 rounded overflow-hidden bg-[#efe6d4] shrink-0">
      {url && <img src={url} alt="" className="w-full h-full object-cover" decoding="async" />}
    </div>
  )
}

function VideoThumb() {
  return (
    <div className="w-9 h-9 md:w-11 md:h-11 rounded bg-[#efe6d4] shrink-0 flex items-center justify-center text-rose text-sm">
      ▶
    </div>
  )
}

function QueueRow({ item }) {
  const isImage = item.file.type.startsWith('image/')
  const pct = Math.round(item.progress * 100)
  const done = item.status === 'done'
  const failed = item.status === 'error'

  return (
    <li className="flex items-center gap-3 py-2">
      {isImage ? <ImageThumb file={item.file} /> : <VideoThumb />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-primary text-[13px] md:text-sm truncate">{item.file.name}</span>
          {done && <span className="text-sage text-xs shrink-0">✓</span>}
          {failed && <span className="text-rose text-[10px] shrink-0">hata</span>}
        </div>
        <div className="mt-1 h-1 rounded-full bg-[#efe6d4] overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${failed ? 'bg-rose' : 'bg-gold'}`}
            style={{ width: `${done ? 100 : pct}%` }}
          />
        </div>
      </div>
    </li>
  )
}

export default function UploadQueue({ items }) {
  if (!items.length) return null

  const active = items.filter((i) => i.status !== 'done').length

  return (
    <div className="w-full mt-4">
      <p className="label-gold mb-1 text-left md:text-[0.7rem]">
        Yükleniyor{active > 0 ? ` · ${active}` : ''}
      </p>
      <ul className="scroll-gold overflow-y-auto max-h-56 pr-1 divide-y divide-[#efe6d4]">
        {items.map((item) => (
          <QueueRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}
