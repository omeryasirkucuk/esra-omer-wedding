// System tab: a setup checklist for fresh deployments, management of the two
// storage-backed assets (invitation music, link-preview image) and a read-only
// snapshot of the env-derived configuration. Secrets render masked; each row
// has its own reveal action that fetches the plaintext on demand.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSystemInfo,
  getSiteContent,
  revealSecret,
  uploadMusic,
  deleteMusic,
  uploadOgImage,
  deleteOgImage,
  addAdminUser,
  setAdminPassword,
  deleteAdminUser,
  AuthError,
} from '../adminApi'
import { confirmDialog, alertDialog } from '../../lib/confirm.js'

// Human-readable size ("3,2 MB").
function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export default function SystemPanel({ onAuthError }) {
  const [info, setInfo] = useState(null)
  const [siteMeta, setSiteMeta] = useState(null)
  const [error, setError] = useState(false)
  // Cache-busting stamp so previews refresh right after an upload.
  const [stamp, setStamp] = useState(0)

  const handleError = useCallback(
    (e) => {
      if (e instanceof AuthError) onAuthError()
      else setError(true)
    },
    [onAuthError],
  )

  const reload = useCallback(() => {
    Promise.all([getSystemInfo(), getSiteContent()])
      .then(([sys, site]) => {
        setInfo(sys)
        setSiteMeta(site?.meta || {})
        setStamp(Date.now())
      })
      .catch(handleError)
  }, [handleError])

  useEffect(() => {
    reload()
  }, [reload])

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!info) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Checklist info={info} siteMeta={siteMeta} />
      <MusicCard info={info} stamp={stamp} onChanged={reload} onAuthError={onAuthError} />
      <OgImageCard info={info} stamp={stamp} onChanged={reload} onAuthError={onAuthError} />
      <AdminUsersCard info={info} onChanged={reload} onAuthError={onAuthError} />
      <ConfigCard info={info} onAuthError={onAuthError} />
    </div>
  )
}

// --- Setup checklist ---------------------------------------------------------

function Checklist({ info, siteMeta }) {
  const items = [
    {
      ok: info.storage.driver === 's3' ? Boolean(info.storage.bucket) : true,
      label:
        info.storage.driver === 's3'
          ? `Depolama: S3 (${info.storage.bucket || 'bucket tanımsız'})`
          : 'Depolama: yerel disk (üretim için S3 önerilir)',
    },
    {
      ok: info.music.uploaded || info.music.bundledFallback,
      label: info.music.uploaded
        ? 'Davetiye müziği yüklendi'
        : info.music.bundledFallback
          ? 'Davetiye müziği: pakete gömülü dosya kullanılıyor'
          : 'Davetiye müziği eksik',
    },
    {
      ok: Boolean(info.ogImage),
      label: info.ogImage
        ? 'Bağlantı önizleme görseli yüklendi'
        : 'Bağlantı önizleme görseli: pakete gömülü og.png kullanılıyor',
    },
    {
      ok: Boolean(siteMeta?.siteUrl),
      label: siteMeta?.siteUrl
        ? `Site adresi: ${siteMeta.siteUrl}`
        : 'Site adresi tanımsız (Düğün Bilgileri › Bağlantı Önizleme)',
    },
    {
      ok: info.admin.usersSource !== 'default',
      label:
        info.admin.usersSource === 'stored'
          ? 'Yönetici hesapları panelden tanımlı'
          : info.admin.usersSource === 'env'
            ? 'Yönetici hesapları .env üzerinden tanımlı'
            : 'Varsayılan yönetici hesapları kullanılıyor (aşağıdan değiştirin)',
    },
    {
      ok: info.admin.secretFromEnv,
      label: info.admin.secretFromEnv
        ? 'Oturum anahtarı (ADMIN_SECRET) .env üzerinden tanımlı'
        : 'Varsayılan oturum anahtarı kullanılıyor (.env ile değiştirin)',
    },
  ]
  return (
    <Section title="Kurulum Kontrol Listesi">
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-0.5 ${it.ok ? 'text-gold' : 'text-rose'}`}>
              {it.ok ? '✓' : '✗'}
            </span>
            <span className="text-ink text-sm">{it.label}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

// --- Invitation music ---------------------------------------------------------

function MusicCard({ info, stamp, onChanged, onAuthError }) {
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  async function handleFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      await uploadMusic(f)
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) onAuthError()
      else await alertDialog('Müzik yüklenemedi, tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog('Yüklenen müzik silinsin mi?')
    if (!ok) return
    setBusy(true)
    try {
      await deleteMusic()
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) onAuthError()
      else await alertDialog('Silinemedi, tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  const m = info.music
  return (
    <Section title="Davetiye Müziği">
      <p className="text-muted text-sm">
        {m.uploaded
          ? `Yüklü dosya çalınıyor${m.size ? ` (${formatSize(m.size)})` : ''}.`
          : m.bundledFallback
            ? 'Pakete gömülü dosya çalınıyor. Yeni bir dosya yükleyerek değiştirebilirsiniz.'
            : 'Henüz müzik yok — davetiye sessiz açılır. Bir MP3 yükleyin.'}
      </p>
      {(m.uploaded || m.bundledFallback) && (
        <audio key={stamp} controls preload="none" src={`/api/music?v=${stamp}`} className="mt-3 w-full" />
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/mp4,.mp3,.m4a"
          className="hidden"
          onChange={handleFile}
        />
        <button type="button" className="btn-lux" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Bekleyin…' : m.uploaded ? 'Müziği Değiştir' : 'Müzik Yükle'}
        </button>
        {m.uploaded && (
          <button
            type="button"
            className="text-rose text-sm border border-rose/40 rounded px-3 py-2 hover:bg-rose/10 transition-colors"
            disabled={busy}
            onClick={handleDelete}
          >
            Yüklenen Müziği Sil
          </button>
        )}
      </div>
    </Section>
  )
}

// --- OG (link preview) image ---------------------------------------------------

function OgImageCard({ info, stamp, onChanged, onAuthError }) {
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  async function handleFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      await uploadOgImage(f)
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) onAuthError()
      else await alertDialog('Görsel yüklenemedi (PNG/JPEG/WebP), tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog('Yüklenen görsel silinsin mi?')
    if (!ok) return
    setBusy(true)
    try {
      await deleteOgImage()
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) onAuthError()
      else await alertDialog('Silinemedi, tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Bağlantı Önizleme Görseli">
      <p className="text-muted text-sm">
        Site bağlantısı WhatsApp veya sosyal medyada paylaşıldığında görünen kare görsel.
      </p>
      <img
        key={stamp}
        src={`/og.png?v=${stamp}`}
        alt="Bağlantı önizleme görseli"
        className="mt-3 w-36 h-36 object-cover rounded border border-line"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <button type="button" className="btn-lux" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Bekleyin…' : info.ogImage ? 'Görseli Değiştir' : 'Görsel Yükle'}
        </button>
        {info.ogImage && (
          <button
            type="button"
            className="text-rose text-sm border border-rose/40 rounded px-3 py-2 hover:bg-rose/10 transition-colors"
            disabled={busy}
            onClick={handleDelete}
          >
            Yüklenen Görseli Sil
          </button>
        )}
      </div>
    </Section>
  )
}

// --- Admin accounts -------------------------------------------------------------
// Add/remove accounts and change passwords. Every action asks for the
// logged-in admin's CURRENT password (verified server-side), so a stolen
// session alone can't rotate the credentials.

const SMALL_INPUT =
  'bg-bg border border-line rounded px-3 py-2 text-ink text-sm outline-none focus:border-gold'

function AdminUsersCard({ info, onChanged, onAuthError }) {
  // Which inline form is open: null | 'add' | username (password change).
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(action, okText) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setOpen(null)
      setMessage(okText)
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) return onAuthError()
      setMessage(
        String(err?.message || '').includes('403')
          ? 'Mevcut şifre yanlış.'
          : 'İşlem başarısız, tekrar deneyin.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(username, currentPassword) {
    const ok = await confirmDialog(`"${username}" hesabı silinsin mi?`)
    if (!ok) return
    run(() => deleteAdminUser(currentPassword, username), 'Hesap silindi.')
  }

  return (
    <Section title="Yönetici Hesapları">
      <ul className="divide-y divide-line">
        {info.admin.users.map((u) => (
          <li key={u} className="py-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink text-sm">{u}</span>
              <button
                type="button"
                className="label-gold shrink-0"
                onClick={() => setOpen(open === u ? null : u)}
              >
                Şifre Değiştir
              </button>
            </div>
            {open === u && (
              <AccountForm
                busy={busy}
                fields={[{ key: 'password', label: 'Yeni şifre' }]}
                submitLabel="Kaydet"
                onSubmit={({ password, currentPassword }) =>
                  run(() => setAdminPassword(currentPassword, u, password), 'Şifre güncellendi.')
                }
                onDelete={
                  info.admin.users.length > 1
                    ? ({ currentPassword }) => handleDelete(u, currentPassword)
                    : null
                }
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <button
          type="button"
          className="text-gold border border-gold/50 rounded px-3 py-2 hover:bg-gold/10 transition-colors text-sm"
          onClick={() => setOpen(open === 'add' ? null : 'add')}
        >
          + Yönetici Ekle
        </button>
        {open === 'add' && (
          <AccountForm
            busy={busy}
            fields={[
              { key: 'username', label: 'Kullanıcı adı', type: 'text' },
              { key: 'password', label: 'Şifre' },
            ]}
            submitLabel="Ekle"
            onSubmit={({ username, password, currentPassword }) =>
              run(() => addAdminUser(currentPassword, username, password), 'Hesap eklendi.')
            }
          />
        )}
      </div>
      {message && <p className="text-gold text-sm mt-3">{message}</p>}
      <p className="text-muted text-xs mt-3">
        Şifreler depolamada hash olarak saklanır. Şifre unutulursa depodaki
        admin_users.json silinerek .env / varsayılan hesaplara dönülür.
      </p>
    </Section>
  )
}

// Inline mini-form: the requested fields plus the mandatory "current password"
// confirmation. Optional delete action shares the same confirmation value.
function AccountForm({ busy, fields, submitLabel, onSubmit, onDelete }) {
  const [values, setValues] = useState({})
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))
  const ready =
    fields.every((f) => String(values[f.key] || '').trim()) &&
    String(values.currentPassword || '').trim()

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="label">{f.label}</span>
          <input
            type={f.type || 'password'}
            value={values[f.key] || ''}
            onChange={set(f.key)}
            autoComplete="new-password"
            className={SMALL_INPUT}
          />
        </label>
      ))}
      <label className="flex flex-col gap-1">
        <span className="label">Mevcut şifren</span>
        <input
          type="password"
          value={values.currentPassword || ''}
          onChange={set('currentPassword')}
          autoComplete="current-password"
          className={SMALL_INPUT}
        />
      </label>
      <button
        type="button"
        className="btn-lux"
        disabled={busy || !ready}
        onClick={() => onSubmit(values)}
      >
        {busy ? 'Bekleyin…' : submitLabel}
      </button>
      {onDelete && (
        <button
          type="button"
          className="text-rose text-sm border border-rose/40 rounded px-3 py-2 hover:bg-rose/10 transition-colors"
          disabled={busy || !String(values.currentPassword || '').trim()}
          onClick={() => onDelete(values)}
        >
          Hesabı Sil
        </button>
      )}
    </div>
  )
}

// --- Configuration snapshot ----------------------------------------------------

function ConfigCard({ info, onAuthError }) {
  const rows = [
    { label: 'Depolama sürücüsü', value: info.storage.driver },
    info.storage.driver === 'local'
      ? { label: 'Veri klasörü', value: info.storage.dir }
      : { label: 'S3 bucket', value: info.storage.bucket, revealKey: 'S3_BUCKET' },
    { label: 'S3 bölgesi', value: info.storage.region },
    { label: 'Müzik anahtarı (MUSIC_KEY)', value: info.music.key },
    { label: 'Ortam', value: `${info.runtime.nodeEnv} · port ${info.runtime.port}` },
  ]
  return (
    <Section title="Yapılandırma">
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="py-2.5 flex items-baseline justify-between gap-4">
            <dt className="label shrink-0">{r.label}</dt>
            <dd className="text-ink text-sm text-right break-all">{r.value || '—'}</dd>
          </div>
        ))}
        {info.secrets.map((s) => (
          <SecretRow key={s.key} secret={s} onAuthError={onAuthError} />
        ))}
      </dl>
      <p className="text-muted text-xs mt-3">
        Bu değerler sunucudaki .env dosyasından okunur; değiştirmek için .env'i düzenleyip
        servisi yeniden başlatın.
      </p>
    </Section>
  )
}

function SecretRow({ secret, onAuthError }) {
  const [revealed, setRevealed] = useState(null)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (revealed !== null) {
      setRevealed(null)
      return
    }
    setBusy(true)
    try {
      const res = await revealSecret(secret.key)
      setRevealed(res.value || '')
    } catch (err) {
      if (err instanceof AuthError) onAuthError()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-2.5 flex items-baseline justify-between gap-4">
      <dt className="label shrink-0">{secret.key}</dt>
      <dd className="text-ink text-sm text-right break-all flex items-baseline justify-end gap-2 min-w-0">
        <span className="font-mono text-xs">
          {revealed !== null ? revealed || '—' : secret.set ? secret.preview : '—'}
        </span>
        {secret.set && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="label-gold shrink-0"
            aria-label={revealed !== null ? 'Gizle' : 'Göster'}
          >
            {revealed !== null ? 'Gizle' : 'Göster'}
          </button>
        )}
      </dd>
    </div>
  )
}

// Shared section/card wrappers, matching SiteEditor's look.
function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className="font-display text-xl text-primary mb-3">{title}</h3>
      <div className="card-soft p-4">{children}</div>
    </section>
  )
}
