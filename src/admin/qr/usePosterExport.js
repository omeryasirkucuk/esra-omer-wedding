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

export function usePosterExport() {
  const [exporting, setExporting] = useState(false)

  // node: the poster element (rendered at base size). type: 'table' | 'entrance'.
  // label: short gallery title. fileName: download name. pixelRatio: scales the
  // modest base px up to print resolution (most content is vector, so it stays
  // crisp). onSaved: receives the persisted gallery entry. onAuthError: bubbles a
  // stale-session 401 up.
  async function exportPoster(node, { type, label, fileName, pixelRatio = 5, onSaved, onAuthError }) {
    if (!node || exporting) return
    setExporting(true)
    try {
      // Fonts must be ready before capture or html-to-image embeds fallbacks.
      if (document.fonts?.ready) await document.fonts.ready
      // Capture the node at its real rendered box; pixelRatio multiplies it up to
      // a large, print-ready PNG (e.g. base 640px × 6 ≈ 3840px wide — fine for a
      // 70×100 large-format print).
      const dataUrl = await toPng(node, {
        width: node.offsetWidth,
        height: node.offsetHeight,
        pixelRatio,
        cacheBust: true,
        backgroundColor: IVORY,
      })
      downloadDataUrl(dataUrl, fileName)
      // Persist the very same PNG to the gallery.
      const blob = await (await fetch(dataUrl)).blob()
      const entry = await uploadQrPoster(blob, { type, label })
      onSaved?.(entry)
    } catch (err) {
      if (err?.name === 'AuthError') onAuthError?.()
      else await alertDialog('Görsel oluşturulamadı, tekrar deneyin.')
    } finally {
      setExporting(false)
    }
  }

  return { exporting, exportPoster }
}
