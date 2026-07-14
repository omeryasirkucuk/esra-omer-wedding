import { useCallback, useEffect, useRef, useState } from 'react'
import Emblem from '../components/Emblem.jsx'
import Sprig from '../components/Sprig.jsx'
import IdentityPrompt from '../components/IdentityPrompt.jsx'
import { api } from '../lib/api.js'
import { getProfile, hasProfile } from '../lib/identity.js'
import UploadQueue from './album/UploadQueue.jsx'
import MyGallery from './album/MyGallery.jsx'
import PublicGallery from './album/PublicGallery.jsx'
import { runWithConcurrency } from '../lib/runWithConcurrency.js'
import { prepareDerivatives } from '../lib/mediaDerivatives.js'

const UPLOAD_CONCURRENCY = 3
const UPLOAD_ATTEMPTS = 3 // retry transient mobile-network failures before giving up

let queueSeq = 0
function makeQueueId() {
  return `q${Date.now()}_${queueSeq++}`
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
        className={`w-full rounded-xl border border-dashed border-gold py-9 md:py-12 flex flex-col items-center gap-3 transition-colors ${
          over ? 'bg-[#f6efe0]' : 'bg-surface/40'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-[34px] h-[34px] md:w-11 md:h-11" fill="none" stroke="var(--c-rose)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="label-gold md:text-[0.7rem]">Foto / Video Seç</span>
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

function AlbumView() {
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

  // Upload one queued file with a few automatic retries. Mobile connections (5G,
  // spotty venue Wi-Fi) drop large uploads mid-flight; a couple of retries with a
  // short backoff turns most of those transient failures into a success instead
  // of a silently lost photo. Marks the row 'error' only after all attempts fail.
  const runUpload = useCallback(
    async (item) => {
      // Render the derivatives on this phone first (serialized module-wide),
      // cached on the closure item so retries never re-decode. null is fine —
      // the server's fallback pipeline covers that file.
      if (item.prep === undefined) {
        setItem(item.id, { status: 'preparing', progress: 0 })
        item.prep = await prepareDerivatives(item.file)
      }
      setItem(item.id, { status: 'uploading', progress: 0 })
      for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
        try {
          await api.uploadFile(item.file, {
            onProgress: (fraction) => setItem(item.id, { progress: fraction }),
            derivatives: item.prep,
          })
          setItem(item.id, { status: 'done', progress: 1 })
          return true
        } catch (err) {
          // A 4xx is permanent (bad request) — retrying just repeats it.
          const permanent = err?.status >= 400 && err?.status < 500
          if (!permanent && attempt < UPLOAD_ATTEMPTS) {
            // Random jitter so a roomful of phones doesn't retry in lockstep
            // against a server that is just coming back up.
            await new Promise((r) => setTimeout(r, 800 * attempt + Math.random() * 1500))
            setItem(item.id, { progress: 0 })
          } else {
            setItem(item.id, { status: 'error' })
            return false
          }
        }
      }
      return false
    },
    [setItem],
  )

  const enqueue = useCallback(
    async (fileList) => {
      const items = Array.from(fileList).map((file) => ({
        id: makeQueueId(),
        file,
        progress: 0,
        status: 'pending',
      }))
      setQueue((prev) => [...items, ...prev])

      const tasks = items.map((item) => () => runUpload(item))
      await runWithConcurrency(tasks, UPLOAD_CONCURRENCY)
      await refreshGallery()
      // Keep failed rows visible (so the guest can retry); only clear the done ones.
      setQueue((prev) => prev.filter((it) => it.status !== 'done'))
    },
    [refreshGallery, runUpload],
  )

  // Retry a single failed upload from its row.
  const retryUpload = useCallback(
    async (item) => {
      await runUpload(item)
      await refreshGallery()
      setQueue((prev) => prev.filter((it) => it.status !== 'done'))
    },
    [runUpload, refreshGallery],
  )

  // Raw delete (no confirm here): the thumbnail's inline trash and the
  // full-screen viewer each run their own confirm before calling this.
  const handleDelete = useCallback(async (item) => {
    setGallery((prev) => prev.filter((g) => g.id !== item.id))
    try {
      await api.deleteUpload(item.id)
    } catch {
      // If the server refused, restore the item.
      setGallery((prev) => (prev.some((g) => g.id === item.id) ? prev : [item, ...prev]))
    }
  }, [])

  // Bulk-delete the given ids (one confirm handled by the caller). Optimistically
  // drops them from the grid, then deletes server-side and re-syncs.
  const handleBulkDelete = useCallback(
    async (ids) => {
      const set = new Set(ids)
      setGallery((prev) => prev.filter((g) => !set.has(g.id)))
      await Promise.allSettled([...set].map((id) => api.deleteUpload(id)))
      await refreshGallery()
    },
    [refreshGallery],
  )

  // Promote/demote the given ids to/from the shared public album. Optimistically
  // flips the local `public` flag, writes server-side, then re-syncs.
  const handleBulkSetPublic = useCallback(
    async (ids, isPublic) => {
      const set = new Set(ids)
      setGallery((prev) => prev.map((g) => (set.has(g.id) ? { ...g, public: isPublic } : g)))
      await Promise.allSettled([...set].map((id) => api.setUploadPublic(id, isPublic)))
      await refreshGallery()
    },
    [refreshGallery],
  )

  return (
    <>
      <p className="font-display italic text-primary text-xl md:text-3xl mt-1 mb-3 text-center">
        Anılarınızı bizimle paylaşın
      </p>
      <Sprig width={130} className="mb-7 mx-auto" />

      <div className="w-full max-w-md md:max-w-2xl mx-auto">
        <Dropzone onFiles={enqueue} />
        <p className="mt-3 text-center font-display italic text-muted text-[12px] md:text-sm leading-relaxed">
          Yüklediklerini yalnızca sen ve düğün sahipleri görür.
          <br />
          “Albüme Ekle” dediklerini ise tüm davetliler görür.
        </p>
        <UploadQueue items={queue} onRetry={retryUpload} />
        <MyGallery
          items={gallery}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkSetPublic={handleBulkSetPublic}
          onSetPublic={(id, isPublic) => handleBulkSetPublic([id], isPublic)}
        />
      </div>
    </>
  )
}

const TABS = [
  { id: 'mine', label: 'Fotoğraflarım' },
  { id: 'public', label: 'Düğün Albümü' },
]

function AlbumTabs({ active, onChange }) {
  return (
    <nav className="w-full max-w-md md:max-w-2xl mx-auto border-b border-line mt-5 mb-8">
      <div className="flex justify-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative font-sans uppercase text-xs tracking-[0.18em] px-4 py-3 whitespace-nowrap transition ${
              active === t.id
                ? 'text-gold after:absolute after:left-4 after:right-4 after:-bottom-px after:h-0.5 after:bg-gold after:rounded'
                : 'text-muted hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default function Album() {
  const [profile, setProfile] = useState(() => getProfile())
  const [tab, setTab] = useState('mine')

  if (!hasProfile() || !profile) {
    return <IdentityPrompt onDone={setProfile} />
  }

  return (
    <section className="min-h-[100svh] flex flex-col items-center px-6 pt-20 pb-16">
      <Emblem className="w-12 md:w-16" linkHome />
      <AlbumTabs active={tab} onChange={setTab} />
      {tab === 'mine' ? <AlbumView /> : <PublicGallery />}
    </section>
  )
}
