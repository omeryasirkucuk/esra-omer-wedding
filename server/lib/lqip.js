// Low-Quality Image Placeholder. A ~24 px WebP encoded as a base64 data URI
// (~300–600 bytes) that the client inlines behind each grid tile, blurred, so a
// preview appears instantly on weak connections with zero extra requests — the
// real thumbnail then fades in on top. Standalone (no storage import) so it can
// run on the upload's temp file without a dependency cycle with thumbnails.js.
import sharp from 'sharp'

const LQIP_WIDTH = 24
const LQIP_QUALITY = 40

// Returns a "data:image/webp;base64,…" string, or null if the file can't be
// processed (unsupported/corrupt) — callers treat a missing LQIP as optional.
export async function computeLqip(filePath) {
  try {
    const buf = await sharp(filePath)
      .rotate() // honor EXIF orientation so the blur matches the real photo
      .resize({ width: LQIP_WIDTH, height: LQIP_WIDTH, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: LQIP_QUALITY })
      .toBuffer()
    return `data:image/webp;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
