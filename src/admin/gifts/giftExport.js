// Export helpers for the gift ledger. PNG/PDF rasterize the off-screen
// GiftSheet node with html-to-image (same approach as the QR poster export,
// minus its gallery upload); Excel builds a real .xlsx via SheetJS. Both jspdf
// and xlsx load on demand so they never weigh down the admin bundle. Every
// format ends in a Blob handed to saveGeneratedFile, which routes touch
// devices through the native share sheet — iOS Safari ignores the synthetic
// data-URL anchor clicks desktop browsers accept.
import { toBlob, toPng } from 'html-to-image'
import { isTouchDevice } from '../../lib/mediaActions.js'
import { saveGeneratedFile } from '../../lib/saveFile.js'

const IVORY = '#fbf7ee'
const DPI = 300

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Print resolution: base 800px × 3 ≈ A4 width at 300dpi.
function renderOptions(node) {
  return {
    width: node.offsetWidth,
    height: node.offsetHeight,
    pixelRatio: 3,
    cacheBust: true,
    backgroundColor: IVORY,
  }
}

// WebKit on touch devices tends to miss webfonts on the first rasterization
// pass; a throwaway warm-up render makes the real one reliable.
async function prepareRender(node) {
  if (document.fonts?.ready) await document.fonts.ready
  if (isTouchDevice()) await toPng(node, renderOptions(node))
}

export async function exportSheetPng(node, fileName) {
  await prepareRender(node)
  const blob = await toBlob(node, renderOptions(node))
  if (!blob) throw new Error('sheet render failed')
  await saveGeneratedFile(blob, fileName)
}

// Single PDF page sized to the sheet at 300 DPI (tall lists just get a taller,
// receipt-like page — fine for both screens and print shops).
export async function exportSheetPdf(node, fileName) {
  await prepareRender(node)
  const dataUrl = await toPng(node, renderOptions(node))
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
  await saveGeneratedFile(pdf.output('blob'), fileName)
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
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
  await saveGeneratedFile(new Blob([out], { type: XLSX_MIME }), fileName)
}
