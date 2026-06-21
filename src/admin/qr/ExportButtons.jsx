// The export actions shared by every QR-poster form: download + archive the
// print-resolution PNG, or download a high-res print PDF of the same render.
// `onExport(format)` runs the form's export; `exporting` disables both while a
// render is in flight.
export default function ExportButtons({ exporting, onExport }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="btn-lux w-full sm:w-auto"
        onClick={() => onExport('png')}
        disabled={exporting}
      >
        {exporting ? 'Oluşturuluyor…' : 'PNG İndir ve Kaydet'}
      </button>
      <button
        type="button"
        className="btn-lux w-full sm:w-auto"
        onClick={() => onExport('pdf')}
        disabled={exporting}
      >
        {exporting ? 'Oluşturuluyor…' : 'PDF İndir'}
      </button>
    </div>
  )
}
