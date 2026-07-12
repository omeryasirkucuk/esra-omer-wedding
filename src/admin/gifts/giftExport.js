// Export helpers for the gift ledger. PNG/PDF rasterize the off-screen
// GiftSheet node with html-to-image (same approach as the QR poster export,
// minus its gallery upload); Excel builds a real .xlsx via SheetJS. Both jspdf
// and xlsx load on demand so they never weigh down the admin bundle.
import { toPng } from 'html-to-image'

const IVORY = '#fbf7ee'
const DPI = 300

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
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Rasterize the sheet at print resolution (base 800px × 3 ≈ A4 width at 300dpi).
async function renderSheet(node) {
  if (document.fonts?.ready) await document.fonts.ready
  return toPng(node, {
    width: node.offsetWidth,
    height: node.offsetHeight,
    pixelRatio: 3,
    cacheBust: true,
    backgroundColor: IVORY,
  })
}

export async function exportSheetPng(node, fileName) {
  downloadDataUrl(await renderSheet(node), fileName)
}

// Single PDF page sized to the sheet at 300 DPI (tall lists just get a taller,
// receipt-like page — fine for both screens and print shops).
export async function exportSheetPdf(node, fileName) {
  const dataUrl = await renderSheet(node)
  const { jsPDF } = await import('jspdf')
  const img = await loadImage(dataUrl)
  const wmm = (img.naturalWidth / DPI) * 25.4
  const hmm = (img.naturalHeight / DPI) * 25.4
  const pdf = new jsPDF({
    unit: 'mm',
    format: [wmm, hmm],
    orientation: wmm > hmm ? 'landscape' : 'portrait',
    compress: true,
  })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  pdf.addImage(dataUrl, 'PNG', 0, 0, pw, ph, undefined, 'FAST')
  pdf.save(fileName)
}

// rows: array of arrays already in display order; numeric cells stay numbers so
// the spreadsheet can keep computing with them. footerLines: strings appended
// under the data (totals / rates).
export async function exportXlsx({ header, rows, footerLines, fileName }) {
  const XLSX = await import('xlsx')
  const aoa = [header, ...rows, [], ...footerLines.map((line) => [line])]
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  sheet['!cols'] = header.map((label, i) => ({ wch: i === 0 ? 24 : Math.max(10, label.length + 4) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Hediyeler')
  XLSX.writeFile(book, fileName)
}
