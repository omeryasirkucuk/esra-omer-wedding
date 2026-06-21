// Turns a poster DOM node into a high-resolution PNG (~300dpi), downloads it for
// the couple, and persists the same bytes to storage so the poster stays in the
// gallery and is re-downloadable forever.
//
// Rendering happens client-side on purpose: the poster is a real Tailwind/SVG
// component using the already-loaded brand fonts and the Emblem, so the export
// matches the on-screen preview exactly (server-side SVG would fall back to
// default fonts and lose the look). `pixelRatio` multiplies the modest base CSS
// size up to print resolution.
import { useState } from 'react'
import { toPng } from 'html-to-image'
import { uploadQrPoster } from '../adminApi'
import { alertDialog } from '../../lib/confirm.js'

const IVORY = '#fbf7ee'

// Trigger a browser download of a data URL under a friendly filename.
function downloadDataUrl(dataUrl, fileName) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Wrap the print-resolution PNG in a single-page PDF sized to the poster at
// 300 DPI, so the print shop gets a high-res, physically-sized file (e.g. a
// 4480px-wide entrance sign → a ~379 mm page that scales cleanly up to 70×100).
// jsPDF is loaded on demand so it never weighs down the PNG path or the bundle.
async function downloadPdf(pngDataUrl, fileName) {
  const { jsPDF } = await import('jspdf')
  const img = await loadImage(pngDataUrl)
  const DPI = 300
  const wmm = (img.naturalWidth / DPI) * 25.4
  const hmm = (img.naturalHeight / DPI) * 25.4
  const pdf = new jsPDF({
    unit: 'mm',
    format: [wmm, hmm],
    orientation: wmm > hmm ? 'landscape' : 'portrait',
    compress: true,
  })
  // Read the real page box back (jsPDF may normalise the custom format) and fill
  // it exactly, so the image always covers the page regardless of orientation.
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, pw, ph, undefined, 'FAST')
  pdf.save(fileName)
}

// Render the poster to a print-resolution PNG data URL.
//
// html-to-image rasterises the DOM through an SVG <foreignObject>, which hangs
// on embedded raster <img> elements (the bought couple/dancer illustrations).
// So we capture the vector layer with the <img>s excluded, then draw each
// illustration back on top onto a canvas at the same scale. Designs without
// illustrations skip the second pass entirely.
async function renderPoster(node, pixelRatio, backgroundColor) {
  const w = node.offsetWidth
  const h = node.offsetHeight
  // Direct-child <img> overlays, in the node's own (unscaled) coordinate space.
  const overlays = [...node.querySelectorAll('img')].map((im) => ({
    src: im.currentSrc || im.src,
    x: im.offsetLeft,
    y: im.offsetTop,
    w: im.offsetWidth,
    h: im.offsetHeight,
  }))

  const vectorUrl = await toPng(node, {
    width: w,
    height: h,
    pixelRatio,
    cacheBust: true,
    backgroundColor: backgroundColor || IVORY,
    filter: (n) => n.tagName !== 'IMG',
  })
  if (overlays.length === 0) return vectorUrl

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * pixelRatio)
  canvas.height = Math.round(h * pixelRatio)
  const ctx = canvas.getContext('2d')
  const base = await loadImage(vectorUrl)
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height)
  for (const o of overlays) {
    const art = await loadImage(o.src)
    ctx.drawImage(art, o.x * pixelRatio, o.y * pixelRatio, o.w * pixelRatio, o.h * pixelRatio)
  }
  return canvas.toDataURL('image/png')
}

export function usePosterExport() {
  const [exporting, setExporting] = useState(false)

  // node: the poster element (rendered at base size). type: 'table' | 'entrance'.
  // label: short gallery title. fileName: download name (always ends ".png"; the
  // extension is swapped per format). pixelRatio: scales the modest base px up to
  // print resolution (most content is vector, so it stays crisp). format: 'png'
  // downloads + archives the PNG; 'pdf' downloads a high-res print PDF only (the
  // gallery stays image-based, so the PNG action owns the archive). onSaved:
  // receives the persisted gallery entry. onAuthError: bubbles a stale-session 401.
  async function exportPoster(node, { type, label, fileName, pixelRatio = 5, backgroundColor, format = 'png', onSaved, onAuthError }) {
    if (!node || exporting) return
    setExporting(true)
    try {
      // Fonts must be ready before capture or html-to-image embeds fallbacks.
      if (document.fonts?.ready) await document.fonts.ready
      // pixelRatio multiplies the modest base px up to a print-ready PNG (e.g.
      // base 640px × 7 ≈ 4480px wide — fine for a 70×100 large-format print).
      const dataUrl = await renderPoster(node, pixelRatio, backgroundColor)
      const name = String(fileName).replace(/\.png$/i, format === 'pdf' ? '.pdf' : '.png')

      if (format === 'pdf') {
        await downloadPdf(dataUrl, name)
        return
      }

      downloadDataUrl(dataUrl, name)
      // Persist the very same PNG to the gallery.
      const blob = await (await fetch(dataUrl)).blob()
      const entry = await uploadQrPoster(blob, { type, label })
      onSaved?.(entry)
    } catch (err) {
      if (err?.name === 'AuthError') onAuthError?.()
      else await alertDialog('Dosya oluşturulamadı, tekrar deneyin.')
    } finally {
      setExporting(false)
    }
  }

  return { exporting, exportPoster }
}
