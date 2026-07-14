// Browser-side media derivatives. Before a photo/video uploads, the guest's
// phone renders the small versions the site actually serves — grid thumbs
// (250/500), the capped lightbox/display image (1280) and the inline blur
// placeholder — so the server never decodes a full-resolution original. That
// decoding is what kept OOM-killing the 512 MB instance under upload bursts;
// a phone resizing its own photo is trivial by comparison.
//
// Everything here is best-effort: prepareDerivatives NEVER throws and returns
// null when the file can't be processed (unsupported format, video capture
// failure, ancient browser). A null just means the server's own gated
// fallback pipeline handles that file, exactly as before this module existed.

const THUMB_250 = 250
const THUMB_500 = 500
const DISPLAY_WIDTH = 1280
const LQIP_WIDTH = 24

// Safari cannot encode WebP from a canvas (it silently returns PNG), so on
// iPhones we send JPEG and the server transcodes the small file to webp.
// Slightly higher JPEG qualities compensate for the double encode.
const QUALITY = {
  webp: { thumb: 0.72, display: 0.82, lqip: 0.4 },
  jpeg: { thumb: 0.8, display: 0.85, lqip: 0.5 },
}

const VIDEO_CAPTURE_TIMEOUT_MS = 8000
const IMAGE_LOAD_TIMEOUT_MS = 15000

// Serialize all decode/encode work: one photo at a time keeps a 150-file
// queue from blowing past iOS Safari's canvas memory budget while uploads
// (network-bound, 3 wide) proceed in parallel.
let gate = Promise.resolve()
function withDecodeSlot(fn) {
  const run = gate.then(fn, fn)
  gate = run.then(
    () => {},
    () => {},
  )
  return run
}

// One-time probe: request a webp blob and trust what comes back, not what we
// asked for — unsupported encoders "succeed" with a PNG.
let webpProbe = null
function supportsWebpEncode() {
  if (!webpProbe) {
    webpProbe = new Promise((resolve) => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 1
        c.toBlob((b) => resolve(b?.type === 'image/webp'), 'image/webp')
      } catch {
        resolve(false)
      }
    })
  }
  return webpProbe
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, quality)
    } catch {
      resolve(null)
    }
  })
}

// Draw `source` into a fresh canvas bounded to `maxSize` on the longest side
// (never upscaling). Stepped chaining — 1280 → 500 → 250 → 24 — keeps each
// downscale ≤ ~3× so the result stays sharp without an intermediate mip loop.
function drawScaled(source, srcW, srcH, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(srcW * scale))
  canvas.height = Math.max(1, Math.round(srcH * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

// iOS Safari keeps decoded canvas backing stores alive until the canvas is
// resized to zero; with hundreds of queued photos that adds up to a tab crash.
function releaseCanvases(canvases) {
  for (const c of canvases) {
    if (c) {
      c.width = 0
      c.height = 0
    }
  }
}

// Produce { thumb250, thumb500, display?, lqip? } from a drawable source.
// `withDisplay` is false for video posters (the site only serves thumb-width
// posters for videos, matching the server pipeline).
async function derivativesFromSource(source, srcW, srcH, withDisplay) {
  const useWebp = await supportsWebpEncode()
  const type = useWebp ? 'image/webp' : 'image/jpeg'
  const q = useWebp ? QUALITY.webp : QUALITY.jpeg

  const display = drawScaled(source, srcW, srcH, DISPLAY_WIDTH)
  const t500 = drawScaled(display, display.width, display.height, THUMB_500)
  const t250 = drawScaled(t500, t500.width, t500.height, THUMB_250)
  const lqipCanvas = drawScaled(t250, t250.width, t250.height, LQIP_WIDTH)
  try {
    const out = {
      thumb250: await canvasToBlob(t250, type, q.thumb),
      thumb500: await canvasToBlob(t500, type, q.thumb),
      display: withDisplay ? await canvasToBlob(display, type, q.display) : null,
      lqip: null,
    }
    try {
      // toDataURL falls back to PNG when the type is unsupported; at 24 px
      // even PNG stays small enough for the manifest's size cap.
      out.lqip = lqipCanvas.toDataURL(type, q.lqip)
      if (out.lqip.length > 8000) out.lqip = null
    } catch {
      /* optional */
    }
    // If any required encode failed, treat the whole prep as failed — partial
    // sets are fine server-side, but a null blob in FormData is not.
    if (!out.thumb250 || !out.thumb500 || (withDisplay && !out.display)) return null
    return out
  } finally {
    releaseCanvases([display, t500, t250, lqipCanvas])
  }
}

async function prepareImage(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  try {
    // onload + drawImage, deliberately NOT img.decode(): Chrome services the
    // decode() queue only while the tab is producing frames, so a guest who
    // backgrounds the app mid-upload would wedge the whole queue on a promise
    // that never settles. drawImage decodes synchronously and EXIF orientation
    // is still applied (default image-orientation: from-image). The timeout
    // guards against undecodable files never firing either event.
    await Promise.race([
      new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('image load failed'))
        img.src = url
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('image load timeout')), IMAGE_LOAD_TIMEOUT_MS)),
    ])
    // Some Androids "load" unsupported formats (HEIC) as 0×0 — treat as failure.
    if (!img.naturalWidth || !img.naturalHeight) return null
    return await derivativesFromSource(img, img.naturalWidth, img.naturalHeight, true)
  } finally {
    URL.revokeObjectURL(url)
    img.src = ''
  }
}

// Capture one early frame of the video as the poster source. iOS needs the
// muted+playsinline play() kick before frames become drawable.
async function prepareVideo(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  try {
    const frame = await Promise.race([
      new Promise((resolve, reject) => {
        video.addEventListener('error', () => reject(new Error('video error')), { once: true })
        // Resolve as soon as a frame is actually drawable, whichever readiness
        // signal fires first — containers differ wildly here (MediaRecorder
        // webm has Infinity duration and unreliable seeking, phone mp4s keep
        // the moov atom at the end, iOS wants a play() kick).
        const tryResolve = () => {
          if (video.readyState >= 2 && video.videoWidth) resolve(true)
        }
        for (const ev of ['loadeddata', 'canplay', 'canplaythrough', 'seeked']) {
          video.addEventListener(ev, tryResolve)
        }
        video.addEventListener(
          'loadedmetadata',
          () => {
            video.play().then(() => video.pause()).catch(() => {})
            // Skip the intro-black first frame when the container can seek.
            if (Number.isFinite(video.duration) && video.duration > 0.3) {
              try {
                video.currentTime = 0.1
              } catch {
                /* unseekable container — the readiness events still fire */
              }
            }
            tryResolve()
          },
          { once: true },
        )
        video.src = url
        video.load()
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('capture timeout')), VIDEO_CAPTURE_TIMEOUT_MS)),
    ]).then(() => {
      if (!video.videoWidth || !video.videoHeight) return null
      return derivativesFromSource(video, video.videoWidth, video.videoHeight, false)
    })
    return frame
  } finally {
    try {
      video.pause()
      video.removeAttribute('src')
      video.load()
    } catch {
      /* teardown best-effort */
    }
    URL.revokeObjectURL(url)
  }
}

// Public API. Resolves to { thumb250, thumb500, display?, lqip? } or null —
// null means "let the server's fallback pipeline handle this file".
export function prepareDerivatives(file) {
  return withDecodeSlot(async () => {
    try {
      const mime = file?.type || ''
      if (mime.startsWith('image/')) return await prepareImage(file)
      if (mime.startsWith('video/')) return await prepareVideo(file)
      return null
    } catch {
      return null
    }
  })
}
