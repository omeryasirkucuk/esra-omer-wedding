// Reserved, non-guest uploader ids. Game images (uploaded by the admin for the
// memory, puzzle and photo-guess games) and QR posters are written into the
// same upload store as guest album photos, distinguished only by these
// synthetic uploader ids. They are not guest photos, so they must never appear
// in the guest album, the admin album panel, or the media counts. This module
// is the single source of truth for those ids.
export const GAME_UPLOADER_ID = 'oyun-gorsel'
export const QR_UPLOADER_ID = 'qr-poster'

export const RESERVED_UPLOADER_IDS = new Set([GAME_UPLOADER_ID, QR_UPLOADER_ID])

export const isReservedUploader = (id) => RESERVED_UPLOADER_IDS.has(id)
