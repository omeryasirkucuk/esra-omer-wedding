// Gift ledger ("Hediye") panel: records what each guest pinned at the wedding —
// cash in TRY/USD/EUR or gold pieces. Mirrors the RSVP panel (summary stats,
// add form, filters, inline-edited list) and adds hand-entered conversion
// rates, a display-unit toggle for the total, and PDF/PNG/Excel export of the
// filtered view. Entries picked from the attendee list carry an rsvpId, which
// puts a star next to that guest on the Katılımcılar tab.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getGifts,
  addGift,
  updateGift,
  deleteGift,
  getGiftSettings,
  saveGiftSettings,
  getRsvps,
  getSiteContent,
} from '../adminApi'
import { formatDateTime } from '../format'
import { confirmDialog, alertDialog } from '../../lib/confirm.js'
import PanelControls from '../PanelControls.jsx'
import Stat from '../Stat.jsx'
import FilterRow from '../FilterRow.jsx'
import Field from '../Field.jsx'
import { matchesQuery, compareNames, compareNewest, normalizeText } from '../search.js'
import { GROUP_OPTIONS, sideOptions, TagSelect, groupLabel, sideLabel } from '../rsvpTags.jsx'
import {
  KIND_OPTIONS,
  GOLD_TYPE_OPTIONS,
  DISPLAY_OPTIONS,
  kindLabel,
  goldTypeLabel,
  giftKarat,
  giftRsvpIds,
  giftValueTry,
  convertFromTry,
  formatValue,
  giftSummaryLabel,
  rateFor,
  goldRateFor,
} from '../gifts/giftModel.js'
import GiftForm from '../gifts/GiftForm.jsx'
import GiftSheet from '../gifts/GiftSheet.jsx'
import { exportSheetPng, exportSheetPdf, exportXlsx } from '../gifts/giftExport.js'

const GIFT_SORTS = [
  { value: 'recent', label: 'Yeni eklenen' },
  { value: 'oldest', label: 'Eski eklenen' },
  { value: 'name', label: 'İsim (A→Z)' },
  { value: 'value', label: 'En değerli' },
]

// Rate inputs (TL per unit) shown in the conversion card. Gold rates are per
// gram at each karat.
const RATE_FIELDS = [
  { key: 'usdTry', label: 'Dolar Kuru (₺)' },
  { key: 'eurTry', label: 'Euro Kuru (₺)' },
  { key: 'gold24Try', label: '24 Ayar Gram (₺)' },
  { key: 'gold22Try', label: '22 Ayar Gram (₺)' },
  { key: 'gold14Try', label: '14 Ayar Gram (₺)' },
]

// Older settings docs carry a single gold rate (`goldGramTry`); surface it as
// the 24-karat rate so the input isn't blank after the upgrade. The legacy key
// is dropped so later saves can't resurrect a cleared 24-karat rate from it.
function normalizeRates(doc) {
  const { goldGramTry, ...rates } = doc || {}
  if (rates.gold24Try == null && goldGramTry != null) rates.gold24Try = goldGramTry
  return rates
}

const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'png', label: 'PNG' },
  { value: 'xlsx', label: 'Excel' },
]

export default function Gifts({ onAuthError }) {
  const [gifts, setGifts] = useState(null)
  const [rates, setRates] = useState({})
  const [rsvps, setRsvps] = useState([])
  const [couple, setCouple] = useState({ bride: '', groom: '' })
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [groupFilter, setGroupFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [goldTypeFilter, setGoldTypeFilter] = useState('all')
  // The unit the summary total (and per-row values) are shown in.
  const [display, setDisplay] = useState('try')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    let alive = true
    getGifts()
      .then((d) => alive && setGifts(d.gifts || []))
      .catch((e) => {
        if (e.name === 'AuthError') onAuthError()
        else if (alive) setError(true)
      })
    getGiftSettings()
      .then((d) => alive && setRates(normalizeRates(d)))
      .catch(() => {})
    getRsvps()
      .then((d) => alive && setRsvps(d.rsvps || []))
      .catch(() => {})
    getSiteContent()
      .then((d) => alive && setCouple({ bride: d?.bride || '', groom: d?.groom || '' }))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [onAuthError])

  const sideOpts = useMemo(() => sideOptions(couple.bride, couple.groom), [couple])
  const groupFilters = [{ value: 'all', label: 'Tümü' }, ...GROUP_OPTIONS.filter((o) => o.value)]
  const sideFilters = [{ value: 'all', label: 'Tümü' }, ...sideOpts.filter((o) => o.value)]
  const kindFilters = [{ value: 'all', label: 'Tümü' }, ...KIND_OPTIONS]
  const goldTypeFilters = [
    { value: 'all', label: 'Tümü' },
    ...GOLD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  ]

  const hasActiveFilter =
    groupFilter !== 'all' ||
    sideFilter !== 'all' ||
    kindFilter !== 'all' ||
    goldTypeFilter !== 'all' ||
    query.trim() !== ''
  function clearFilters() {
    setGroupFilter('all')
    setSideFilter('all')
    setKindFilter('all')
    setGoldTypeFilter('all')
    setQuery('')
  }

  // Tag/kind filters, then name search, then ordering ("En değerli" needs the
  // rates, so entries with no computable value sink to the bottom).
  const filtered = useMemo(() => {
    const comparators = {
      recent: (a, b) => compareNewest(a.createdAt, b.createdAt),
      oldest: (a, b) => -compareNewest(a.createdAt, b.createdAt),
      name: (a, b) => compareNames(a.name, b.name),
      value: (a, b) => (giftValueTry(b, rates) ?? -1) - (giftValueTry(a, rates) ?? -1),
    }
    return (gifts || [])
      .filter((g) => groupFilter === 'all' || (g.group || '') === groupFilter)
      .filter((g) => sideFilter === 'all' || (g.side || '') === sideFilter)
      .filter((g) => kindFilter === 'all' || g.kind === kindFilter)
      .filter((g) => goldTypeFilter === 'all' || (g.kind === 'gold' && g.goldType === goldTypeFilter))
      .filter((g) => matchesQuery(query, g.name, g.note))
      .sort(comparators[sort] || comparators.recent)
  }, [gifts, rates, query, sort, groupFilter, sideFilter, kindFilter, goldTypeFilter])

  // Summary of the filtered view. The total is only shown when every visible
  // entry is convertible with the entered rates — a partial sum would lie.
  const totals = useMemo(() => {
    const people = new Set(filtered.map((g) => g.rsvpId || `n:${normalizeText(g.name)}`)).size
    let totalTry = 0
    let missingRate = false
    // Gold breakdown of the filtered view: piece count and total grams per
    // subtype, plus the grand total of grams — so "how many çeyrek / how many
    // grams" reads straight off the summary.
    const goldPieces = {}
    let goldGrams = 0
    for (const g of filtered) {
      const v = giftValueTry(g, rates)
      if (v == null) missingRate = true
      else totalTry += v
      if (g.kind !== 'gold') continue
      const count = Number(g.count) || 0
      const grams = (Number(g.grams) || 0) * count
      goldGrams += grams
      const type = g.goldType || 'other'
      if (!goldPieces[type]) goldPieces[type] = { count: 0, grams: 0 }
      goldPieces[type].count += count
      goldPieces[type].grams += grams
    }
    const goldTypes = GOLD_TYPE_OPTIONS.filter((o) => goldPieces[o.value]).map((o) => ({
      value: o.value,
      label: o.label,
      ...goldPieces[o.value],
    }))
    const shown = missingRate ? null : convertFromTry(totalTry, display, rates)
    return { people, entries: filtered.length, totalTry, missingRate, shown, goldGrams, goldTypes }
  }, [filtered, rates, display])

  const totalLabel = formatValue(totals.shown, display, display === 'gold' ? 2 : 0)

  const handleError = (e, setLocal) => {
    if (e.name === 'AuthError') onAuthError()
    else if (setLocal) setLocal()
  }

  // Add flow lives in GiftForm; this persists + prepends, rethrowing so the
  // form can show its inline error.
  async function handleAdd(payload) {
    try {
      const created = await addGift(payload)
      setGifts((prev) => [created, ...(prev || [])])
    } catch (err) {
      if (err.name === 'AuthError') onAuthError()
      throw err
    }
  }

  // Persist an edited numeric field (amount/count/grams) on blur.
  async function handleNumberBlur(entry, field, rawValue) {
    const value = Number(rawValue)
    if (!(Number.isFinite(value) && value > 0) || (entry[field] ?? 0) === value) return
    try {
      const updated = await updateGift({ id: entry.id, [field]: value })
      setGifts((prev) => (prev || []).map((g) => (g.id === entry.id ? { ...g, ...updated } : g)))
    } catch (err) {
      handleError(err)
    }
  }

  async function handleNoteBlur(entry, rawValue) {
    const value = rawValue.trim().slice(0, 200)
    if ((entry.note || '') === value) return
    setGifts((prev) => (prev || []).map((g) => (g.id === entry.id ? { ...g, note: value } : g)))
    try {
      await updateGift({ id: entry.id, note: value })
    } catch (err) {
      handleError(err)
    }
  }

  async function handleTagChange(entry, field, value) {
    if ((entry[field] || '') === value) return
    setGifts((prev) => (prev || []).map((g) => (g.id === entry.id ? { ...g, [field]: value } : g)))
    try {
      await updateGift({ id: entry.id, [field]: value })
    } catch (err) {
      handleError(err)
    }
  }

  async function handleDelete(entry) {
    if (!(await confirmDialog(`${entry.name} — ${giftSummaryLabel(entry)} silinsin mi?`))) return
    try {
      await deleteGift(entry.id)
      setGifts((prev) => (prev || []).filter((g) => g.id !== entry.id))
    } catch (err) {
      handleError(err)
    }
  }

  // Persist an edited conversion rate on blur.
  async function handleRateBlur(field, rawValue) {
    const n = Number(rawValue)
    const value = Number.isFinite(n) && n > 0 ? n : null
    if ((rates?.[field] ?? null) === value) return
    const next = { ...rates, [field]: value }
    setRates(next)
    try {
      await saveGiftSettings(next)
    } catch (err) {
      handleError(err)
    }
  }

  // Display-ready rows shared by the print sheet and the spreadsheet.
  const exportRows = useMemo(
    () =>
      filtered.map((g) => ({
        gift: g,
        name: g.name,
        group: groupLabel(g.group),
        side: sideLabel(g.side, couple.bride, couple.groom),
        summary: giftSummaryLabel(g),
        valueTry: giftValueTry(g, rates),
      })),
    [filtered, rates, couple],
  )

  const ratesLine = useMemo(() => {
    const parts = []
    if (rateFor('usd', rates)) parts.push(`1 $ = ${formatValue(rateFor('usd', rates), 'try')}`)
    if (rateFor('eur', rates)) parts.push(`1 € = ${formatValue(rateFor('eur', rates), 'try')}`)
    for (const karat of [24, 22, 14]) {
      const rate = goldRateFor(karat, rates)
      if (rate) parts.push(`1 g ${karat} ayar = ${formatValue(rate, 'try')}`)
    }
    return parts.join(' · ')
  }, [rates])

  async function handleExport(format) {
    setExportOpen(false)
    if (exporting || exportRows.length === 0) return
    setExporting(true)
    try {
      if (format === 'xlsx') {
        await exportXlsx({
          header: ['Ad Soyad', 'Grup', 'Yakınlık', 'Cinsi', 'Altın Türü', 'Ayar', 'Adet', 'Gram', 'Tutar', 'TL Karşılığı', 'Not', 'Tarih'],
          rows: exportRows.map(({ gift: g, ...r }) => [
            r.name,
            r.group,
            r.side,
            kindLabel(g.kind),
            g.kind === 'gold' ? goldTypeLabel(g.goldType) : '',
            g.kind === 'gold' ? giftKarat(g) : '',
            g.kind === 'gold' ? g.count : '',
            g.kind === 'gold' ? g.grams : '',
            g.kind === 'gold' ? '' : g.amount,
            r.valueTry == null ? '' : Math.round(r.valueTry * 100) / 100,
            g.note || '',
            formatDateTime(g.createdAt),
          ]),
          footerLines: [
            `Toplam: ${totalLabel ?? 'kur girilmedi'} (${totals.people} kişi, ${totals.entries} hediye)`,
            ...(ratesLine ? [`Kur: ${ratesLine}`] : []),
          ],
          fileName: 'hediyeler.xlsx',
        })
      } else if (format === 'png') {
        await exportSheetPng(sheetRef.current, 'hediyeler.png')
      } else {
        await exportSheetPdf(sheetRef.current, 'hediyeler.pdf')
      }
    } catch (err) {
      if (err?.name === 'AuthError') onAuthError()
      else await alertDialog('Dosya oluşturulamadı, tekrar deneyin.')
    } finally {
      setExporting(false)
    }
  }

  if (error) return <p className="text-muted text-center py-10">Veriler yüklenemedi.</p>
  if (!gifts) return <p className="text-muted text-center py-10">Yükleniyor…</p>

  return (
    <div>
      {/* Filtered-view summary. */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Stat label="Kişi" value={totals.people} />
        <Stat label="Hediye" value={totals.entries} />
        <Stat
          label="Toplam Değer"
          value={totalLabel ?? '—'}
          hint={totalLabel == null ? 'kur girilmedi' : ''}
          highlight
        />
      </div>

      {/* Gold breakdown of the filtered view: total grams + piece count per
          subtype (çeyrek/yarım/…), each with its gram subtotal underneath. */}
      {totals.goldTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Stat label="Toplam Gram" value={formatValue(totals.goldGrams, 'gold', 2) ?? '—'} highlight />
          {totals.goldTypes.map((t) => (
            <Stat key={t.value} label={t.label} value={t.count} hint={formatValue(t.grams, 'gold', 2)} />
          ))}
        </div>
      )}

      {/* Hand-entered conversion rates + the unit the total is shown in. */}
      <div className="card-soft p-4 mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        {RATE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label} className="flex-1 min-w-[7rem]">
            <input
              type="number"
              min="0"
              step="any"
              defaultValue={rates?.[key] ?? ''}
              key={`${key}-${rates?.[key] ?? ''}`}
              onBlur={(e) => handleRateBlur(key, e.target.value)}
              className="w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
            />
          </Field>
        ))}
        <div className="flex flex-col gap-1">
          <span className="label">Toplam Birimi</span>
          <div className="flex flex-wrap gap-1.5">
            {DISPLAY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setDisplay(o.value)}
                className={`rounded-full px-3 py-1.5 text-sm border transition ${
                  display === o.value
                    ? 'bg-gold text-surface border-gold'
                    : 'bg-bg text-muted border-line hover:border-gold'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <GiftForm rsvps={rsvps} sideOpts={sideOpts} onAdd={handleAdd} />

      <PanelControls
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        sortOptions={GIFT_SORTS}
      />

      <div className="card-soft p-3 sm:p-4 mb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="label-gold">Filtreler</span>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilter}
            className="label-gold transition-colors hover:text-rose disabled:opacity-30 disabled:cursor-default disabled:hover:text-current"
          >
            Filtreleri Temizle
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <FilterRow label="Grup" value={groupFilter} onChange={setGroupFilter} options={groupFilters} />
          <FilterRow label="Yakınlık" value={sideFilter} onChange={setSideFilter} options={sideFilters} />
          <FilterRow label="Cinsi" value={kindFilter} onChange={setKindFilter} options={kindFilters} />
          <FilterRow label="Altın Türü" value={goldTypeFilter} onChange={setGoldTypeFilter} options={goldTypeFilters} />
        </div>
      </div>

      {/* Export of the filtered view — the styled in-page menu, never a native one. */}
      <div className="flex justify-end mb-3 relative">
        <button
          type="button"
          className="btn-lux"
          disabled={exporting || exportRows.length === 0}
          onClick={() => setExportOpen((o) => !o)}
        >
          {exporting ? 'Hazırlanıyor…' : 'Dışa Aktar'}
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 card-soft z-30 overflow-hidden min-w-[8rem]">
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleExport(f.value)}
                className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-gold/10 transition-colors"
                lang="en"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {gifts.length === 0 ? (
        <p className="text-muted text-center py-10">Henüz hediye kaydı yok</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-10">Eşleşen kayıt yok</p>
      ) : (
        <div className="card-soft scroll-gold overflow-auto max-h-[60vh]">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-line label-gold sticky top-0 bg-surface z-10">
            <span>Kişi</span>
            <span className="text-right w-52">Hediye</span>
            <span className="text-right w-28">Değer</span>
            <span className="text-right w-36">Tarih</span>
            <span className="w-8" />
          </div>

          <ul>
            {filtered.map((g) => (
              <li
                key={g.id}
                className="px-4 py-3 border-b border-line/60 last:border-0 flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4 sm:items-center"
              >
                <div className="sm:block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-primary flex items-center gap-2 min-w-0">
                      <span className="truncate">{g.name}</span>
                      {giftRsvpIds(g).length > 0 && (
                        <span className="text-gold shrink-0" title="Katılımcıya bağlı" aria-label="Katılımcıya bağlı">
                          ★
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(g)}
                      aria-label="Sil"
                      title="Sil"
                      className="shrink-0 text-muted hover:text-rose transition-colors sm:hidden"
                    >
                      🗑
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <TagSelect
                      value={g.group || ''}
                      onChange={(v) => handleTagChange(g, 'group', v)}
                      options={GROUP_OPTIONS}
                      tone="group"
                    />
                    <TagSelect
                      value={g.side || ''}
                      onChange={(v) => handleTagChange(g, 'side', v)}
                      options={sideOpts}
                      tone="side"
                    />
                  </div>
                  <input
                    type="text"
                    defaultValue={g.note || ''}
                    key={`note-${g.id}-${g.note || ''}`}
                    placeholder="Not ekle"
                    onBlur={(e) => handleNoteBlur(g, e.target.value)}
                    className="mt-1.5 w-full max-w-xs box-border bg-bg border border-line rounded px-2.5 py-1 text-sm text-ink outline-none focus:border-gold"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 sm:mt-0 sm:contents">
                  {/* What was given, with the numbers editable in place. */}
                  <div className="flex items-center gap-1.5 sm:justify-end sm:w-52">
                    <span className="label-gold text-[0.55rem] border border-gold/50 rounded px-1.5 py-0.5 shrink-0">
                      {g.kind === 'gold' ? `${goldTypeLabel(g.goldType)} · ${giftKarat(g)}` : kindLabel(g.kind)}
                    </span>
                    {g.kind === 'gold' ? (
                      <>
                        <input
                          type="number"
                          min="1"
                          defaultValue={g.count}
                          key={`count-${g.id}-${g.count}`}
                          onBlur={(e) => handleNumberBlur(g, 'count', e.target.value)}
                          title="Adet"
                          className="w-14 box-border bg-bg border border-line rounded px-2 py-1 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
                        />
                        <span className="text-muted text-sm">×</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          defaultValue={g.grams}
                          key={`grams-${g.id}-${g.grams}`}
                          onBlur={(e) => handleNumberBlur(g, 'grams', e.target.value)}
                          title="Gram"
                          className="w-20 box-border bg-bg border border-line rounded px-2 py-1 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
                        />
                        <span className="text-muted text-sm">g</span>
                      </>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="any"
                        defaultValue={g.amount}
                        key={`amount-${g.id}-${g.amount}`}
                        onBlur={(e) => handleNumberBlur(g, 'amount', e.target.value)}
                        title="Tutar"
                        className="w-24 box-border bg-bg border border-line rounded px-2 py-1 text-ink text-right lining-nums tabular-nums outline-none focus:border-gold"
                      />
                    )}
                  </div>
                  <span className="text-ink text-sm whitespace-nowrap sm:text-right sm:w-28 lining-nums tabular-nums">
                    {formatValue(
                      convertFromTry(giftValueTry(g, rates), display, rates),
                      display,
                      display === 'gold' ? 2 : 0,
                    ) ?? '—'}
                  </span>
                  <span className="text-muted text-sm whitespace-nowrap basis-full sm:basis-auto sm:text-right sm:w-36 sm:self-center lining-nums tabular-nums">
                    {formatDateTime(g.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(g)}
                    aria-label="Sil"
                    title="Sil"
                    className="hidden sm:block text-muted hover:text-rose transition-colors sm:w-8 sm:text-center"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Off-screen print sheet the PNG/PDF exports rasterize. */}
      <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden="true">
        <GiftSheet
          innerRef={sheetRef}
          title={couple.bride && couple.groom ? `${couple.bride} & ${couple.groom}` : 'Hediye Defteri'}
          rows={exportRows.map((r) => ({
            name: r.name,
            group: r.group,
            side: r.side,
            gift: r.summary,
            value:
              formatValue(
                convertFromTry(r.valueTry, display, rates),
                display,
                display === 'gold' ? 2 : 0,
              ) ?? '—',
            note: r.gift.note || '',
          }))}
          totals={{ people: totals.people, entries: totals.entries, value: totalLabel ?? '—' }}
          ratesLine={ratesLine}
          generatedAt={formatDateTime(new Date().toISOString())}
        />
      </div>
    </div>
  )
}
