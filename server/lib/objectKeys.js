// Storage keys for the single managed objects, shared by the public serving
// routes and the admin upload endpoints so they can never drift apart.

// Invitation background music. MUSIC_KEY stays overridable via env for
// deployments that placed the file out-of-band before the admin upload existed.
export const MUSIC_KEY = process.env.MUSIC_KEY || 'music/davetiye-music.mp3'

// Link-preview (Open Graph) image, uploadable from the admin System tab.
export const OG_IMAGE_KEY = 'site/og.png'
