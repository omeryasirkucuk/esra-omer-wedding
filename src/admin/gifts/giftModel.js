// Gift ("Hediye") domain model: kinds, gold subtypes, valuation and formatting.
// A gift is either cash (TRY/USD/EUR + amount) or gold (subtype + piece count +
// grams per piece). All conversions go through TL using the couple's
// hand-entered rates { usdTry, eurTry, goldGramTry } — TL per 1 USD / 1 EUR /
// 1 gram of gold. A missing rate yields `null` values so callers can render a
// deliberate "no rate entered" state instead of a wrong number.

export const KIND_OPTIONS = [
  { value: 'try', label: 'TL' },
  { value: 'usd', label: 'Dolar' },
  { value: 'eur', label: 'Euro' },
  { value: 'gold', label: 'Altın' },
]

export function kindLabel(value) {
  return KIND_OPTIONS.find((o) => o.value === value)?.label || ''
}

// Common Turkish wedding gold pieces. `grams` is the default per-piece weight
// pre-filled into the form; bracelet/other weights vary, so they start empty.
export const GOLD_TYPE_OPTIONS = [
  { value: 'ceyrek', label: 'Çeyrek', grams: 1.75 },
  { value: 'yarim', label: 'Yarım', grams: 3.5 },
  { value: 'tam', label: 'Tam', grams: 7 },
  { value: 'gram', label: 'Gram Altın', grams: 1 },
  { value: 'bilezik', label: 'Bilezik', grams: null },
  { value: 'other', label: 'Diğer', grams: null },
]

export function goldTypeLabel(value) {
  return GOLD_TYPE_OPTIONS.find((o) => o.value === value)?.label || ''
}

export function defaultGrams(goldType) {
  return GOLD_TYPE_OPTIONS.find((o) => o.value === goldType)?.grams ?? null
}

// The summary total can be shown in any of these units.
export const DISPLAY_OPTIONS = [
  { value: 'try', label: 'TL' },
  { value: 'usd', label: 'Dolar' },
  { value: 'eur', label: 'Euro' },
  { value: 'gold', label: 'Altın (g)' },
]

// TL per one unit of `currency` ('try'|'usd'|'eur'|'gold'), or null when the
// couple hasn't entered that rate yet.
export function rateFor(currency, rates) {
  if (currency === 'try') return 1
  const value =
    currency === 'usd' ? rates?.usdTry : currency === 'eur' ? rates?.eurTry : rates?.goldGramTry
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

// A gift's worth in TL, or null when the needed rate is missing.
export function giftValueTry(gift, rates) {
  if (gift.kind === 'gold') {
    const rate = rateFor('gold', rates)
    if (rate == null) return null
    return (Number(gift.count) || 0) * (Number(gift.grams) || 0) * rate
  }
  const rate = rateFor(gift.kind, rates)
  if (rate == null) return null
  return (Number(gift.amount) || 0) * rate
}

// Re-express a TL value in the chosen display unit ('gold' = grams of gold).
export function convertFromTry(valueTry, currency, rates) {
  if (valueTry == null) return null
  const rate = rateFor(currency, rates)
  if (rate == null) return null
  return valueTry / rate
}

const numberFormats = new Map()
function formatNumber(value, maxFraction) {
  if (!numberFormats.has(maxFraction)) {
    numberFormats.set(
      maxFraction,
      new Intl.NumberFormat('tr-TR', { maximumFractionDigits: maxFraction }),
    )
  }
  return numberFormats.get(maxFraction).format(value)
}

const CURRENCY_SYMBOLS = { try: '₺', usd: '$', eur: '€' }

// "12.500 ₺", "$100", "€250,50", "38,5 g" — null stays null so callers can
// render their own em-dash / "kur girilmedi" state.
export function formatValue(value, currency, maxFraction = 2) {
  if (value == null) return null
  if (currency === 'gold') return `${formatNumber(value, maxFraction)} g`
  const text = formatNumber(value, maxFraction)
  return currency === 'try' ? `${text} ₺` : `${CURRENCY_SYMBOLS[currency]}${text}`
}

// Short human label of what was given: "2 × Çeyrek (1,75 g)" / "$100".
export function giftSummaryLabel(gift) {
  if (gift.kind === 'gold') {
    return `${gift.count} × ${goldTypeLabel(gift.goldType)} (${formatNumber(gift.grams ?? 0, 2)} g)`
  }
  return formatValue(gift.amount ?? 0, gift.kind)
}
