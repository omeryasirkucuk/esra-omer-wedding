import { useRef, useState } from 'react'

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8 L7 8 L8.5 5.5 L15.5 5.5 L17 8 L20 8 A1.5 1.5 0 0 1 21.5 9.5 V18 A1.5 1.5 0 0 1 20 19.5 H4 A1.5 1.5 0 0 1 2.5 18 V9.5 A1.5 1.5 0 0 1 4 8 Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
)

// The top compose card: a transparent textarea, an optional photo/video
// attachment with a tiny preview, and the "Paylaş" button.
export default function Composer({ onSubmit, busy, progress }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInput = useRef(null)

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed && !file) return
    const ok = await onSubmit({ text: trimmed, file })
    if (ok) {
      setText('')
      clearFile()
    }
  }

  const isVideo = file?.type?.startsWith('video')

  return (
    <div className="card-soft p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Esra & Ömer'e birkaç kelime…"
        className="w-full bg-transparent resize-none font-display text-primary text-[15px] leading-relaxed placeholder:text-[#9aa6b0] focus:outline-none"
      />

      {file && (
        <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#f4ecdd] px-2 py-1.5">
          {isVideo ? (
            <video src={previewUrl} className="h-9 w-9 rounded object-cover" muted />
          ) : (
            <img src={previewUrl} alt="" className="h-9 w-9 rounded object-cover" />
          )}
          <span className="flex-1 truncate font-display text-[13px] text-primary-soft">
            {file.name}
          </span>
          <button
            type="button"
            onClick={clearFile}
            aria-label="Eki kaldır"
            className="text-muted text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label="Fotoğraf veya video ekle"
          className="text-rose p-1.5 -ml-1.5"
        >
          <CameraIcon />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          onChange={pickFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={submit}
          disabled={busy || (!text.trim() && !file)}
          className="btn-lux disabled:opacity-50"
        >
          {busy
            ? progress != null
              ? `%${Math.round(progress * 100)}`
              : 'Gönderiliyor…'
            : 'Paylaş'}
        </button>
      </div>
    </div>
  )
}
