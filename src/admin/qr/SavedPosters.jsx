// Gallery of every poster the couple has generated. Saved posters persist (in
// S3 in production) and stay here until explicitly deleted — each one is
// re-downloadable and removable via an in-page confirm dialog.
import { posterThumbUrl, fileDownloadUrl, deleteQrPoster } from '../adminApi'
import { confirmDialog, alertDialog } from '../../lib/confirm.js'

const TYPE_LABEL = {
  table: 'Masa Kartı',
  guest: 'Davetli Kartı',
  entrance: 'Giriş Afişi',
  'table-tent': 'Masa Kartı (Üçgen)',
  'guest-tent': 'Davetli Kartı (Üçgen)',
}
const FILE_PREFIX = {
  table: 'masa-karti',
  guest: 'davetli-karti',
  entrance: 'giris-afisi',
  'table-tent': 'masa-karti-ucgen',
  'guest-tent': 'davetli-karti-ucgen',
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// A true download (attachment) that works on both storage drivers — the /media
// URL 302-redirects to a presigned S3 link with no filename, so route the
// re-download through the admin streaming endpoint instead.
function downloadHref(poster) {
  const storedName = String(poster.url || '').split('/').pop()
  return fileDownloadUrl(poster.slug, {
    storedName,
    originalName: `${FILE_PREFIX[poster.type] || 'poster'}.png`,
    mime: 'image/png',
  })
}

export default function SavedPosters({ posters, onDelete, onAuthError }) {
  async function handleDelete(poster) {
    const ok = await confirmDialog('Bu poster silinsin mi?', { okText: 'Sil' })
    if (!ok) return
    try {
      await deleteQrPoster(poster.id)
      onDelete(poster.id)
    } catch (e) {
      if (e.name === 'AuthError') onAuthError()
      else await alertDialog('Silinemedi, tekrar deneyin.')
    }
  }

  if (!posters.length) {
    return (
      <p className="text-muted text-sm text-center py-8">
        Henüz kayıtlı poster yok. Oluşturduklarınız burada saklanır.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {posters.map((p) => (
        <div
          key={p.id}
          className="card-soft p-3 flex flex-col gap-2"
          style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
        >
          <div className="rounded-lg overflow-hidden border border-[#e2d6b8] bg-bg">
            <img
              src={posterThumbUrl(p.url)}
              alt={p.label || TYPE_LABEL[p.type]}
              loading="lazy"
              className="w-full aspect-[3/4] object-contain"
            />
          </div>
          <div className="min-w-0">
            <span className="label-gold">{TYPE_LABEL[p.type] || 'Poster'}</span>
            <p className="text-muted text-xs mt-0.5">{formatDate(p.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            <a
              href={downloadHref(p)}
              className="btn-lux no-underline text-center text-[0.7rem] px-3 py-1.5 flex-1"
            >
              İndir
            </a>
            <button
              type="button"
              onClick={() => handleDelete(p)}
              aria-label="Posteri sil"
              className="w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center text-sm hover:bg-surface transition shrink-0"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
