// Helpers shared by the storage drivers.

// Turkish-aware slug for the per-uploader folder name ("ayse-k-7f3a").
export function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    (text || 'misafir')
      .toLowerCase()
      .replace(/[çğıİöşü]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'misafir'
  )
}

// Stable, driver-independent media URL the front-end stores and renders.
// The /media route resolves it (disk file locally, presigned redirect on S3),
// so URLs never expire even though S3 presigned links do.
export function mediaUrl(slug, storedName) {
  return `/media/${slug}/${storedName}`
}
