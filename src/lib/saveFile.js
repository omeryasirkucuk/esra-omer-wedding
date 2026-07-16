// Hand a client-generated file (export PNG/PDF/XLSX, …) to the user. Phones
// and tablets get the native share sheet ("Save to Files" / "Save Image")
// because iOS Safari silently drops programmatic data-URL/anchor downloads
// fired after async work; desktop gets a plain object-URL download. Same
// device split as saveMedia in mediaActions.js.
import { isTouchDevice } from './mediaActions.js'

export async function saveGeneratedFile(blob, fileName) {
  if (isTouchDevice() && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return // user closed the sheet
        // gesture window expired or the file type was refused → plain download
      }
    }
  }
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can abort a download Safari hasn't started yet.
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}
