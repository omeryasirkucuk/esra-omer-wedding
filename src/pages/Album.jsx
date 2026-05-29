import { useCallback, useEffect, useRef, useState } from 'react'
import Emblem from '../components/Emblem.jsx'
import Sprig from '../components/Sprig.jsx'
import IdentityPrompt from '../components/IdentityPrompt.jsx'
import { api } from '../lib/api.js'
import { getProfile, hasProfile, clearProfile } from '../lib/identity.js'
import UploadQueue from './album/UploadQueue.jsx'
import MyGallery from './album/MyGallery.jsx'
import { runWithConcurrency } from './album/runWithConcurrency.js'

const UPLOAD_CONCURRENCY = 3

let queueSeq = 0
function makeQueueId() {
  return `q${Date.now()}_${queueSeq++}`
}

// Greeting chip, offset from the fixed menu button so they never overlap.
function GreetingChip({ firstName, onChange }) {
  return (
    <div className="fixed top-4 right-16 z-40 flex items-center gap-1.5 rounded-full border border-line bg-surface/70 backdrop-blur px-3 h-10">
      <span className="font-display text-primary text-[13px]">👋 {firstName}</span>
      <span className="text-muted text-[12px]">·</span>
      <button type="button" onClick={onChange} className="label-gold">
        değiştir
      </button>
    </div>
  )
}

function Dropzone({ onFiles }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`w-full rounded-xl border border-dashed border-gold py-9 flex flex-col items-center gap-3 transition-colors ${
          over ? 'bg-[#f6efe0]' : 'bg-surface/40'
        }`}
      >
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="var(--c-rose)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="label-gold">Foto / Video Seç</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}

function AlbumView({ profile, onChangeProfile }) {
  const [queue, setQueue] = useState([])
  const [gallery, setGallery] = useState([])

  const refreshGallery = useCallback(async () => {
    try {
      const res = await api.listMyUploads()
      setGallery(res?.items || [])
    } catch {
      // Network hiccup: keep whatever is already shown.
    }
  }, [])

  useEffect(() => {
    refreshGallery()
  }, [refreshGallery])

  const setItem = useCallback((id, patch) => {
    setQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const enqueue = useCallback(
    async (fileList) => {
      const items = Array.from(fileList).map((file) => ({
        id: makeQueueId(),
        file,
        progress: 0,
        status: 'pending',
      }))
      setQueue((prev) => [...items, ...prev])

      const tasks = items.map((item) => async () => {
        setItem(item.id, { status: 'uploading' })
        try {
          await api.uploadFile(item.file, {
            onProgress: (fraction) => setItem(item.id, { progress: fraction }),
          })
          setItem(item.id, { status: 'done', progress: 1 })
        } catch {
          setItem(item.id, { status: 'error' })
        }
      })

      await runWithConcurrency(tasks, UPLOAD_CONCURRENCY)
      await refreshGallery()
      // Drop finished rows after the gallery has caught up.
      setQueue((prev) => prev.filter((it) => it.status === 'uploading' || it.status === 'pending'))
    },
    [refreshGallery, setItem],
  )

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm('Bu yüklemeyi silmek istiyor musun?')) return
    setGallery((prev) => prev.filter((g) => g.id !== item.id))
    try {
      await api.deleteUpload(item.id)
    } catch {
      // If the server refused, restore the item.
      setGallery((prev) => (prev.some((g) => g.id === item.id) ? prev : [item, ...prev]))
    }
  }, [])

  return (
    <section className="min-h-[100svh] flex flex-col items-center px-6 pt-20 pb-16">
      <GreetingChip firstName={profile.firstName} onChange={onChangeProfile} />

      <Emblem size={48} linkHome />
      <p className="label mt-5">Düğün Albümü</p>
      <p className="font-display italic text-primary text-xl mt-1 mb-3">
        Anılarınızı bizimle paylaşın
      </p>
      <Sprig width={130} className="mb-7" />

      <div className="w-full max-w-md">
        <Dropzone onFiles={enqueue} />
        <UploadQueue items={queue} />
        <MyGallery items={gallery} onDelete={handleDelete} />
      </div>
    </section>
  )
}

export default function Album() {
  const [profile, setProfile] = useState(() => getProfile())

  if (!hasProfile() || !profile) {
    return <IdentityPrompt onDone={setProfile} />
  }

  const changeProfile = () => {
    clearProfile()
    setProfile(null)
  }

  return <AlbumView profile={profile} onChangeProfile={changeProfile} />
}
