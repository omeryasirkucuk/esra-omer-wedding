// Gift ("Hediye") domain model: kinds, gold subtypes, valuation and formatting.
// A gift is either cash (TRY/USD/EUR + amount) or gold (subtype + karat +
// piece count + grams per piece). All conversions go through TL using the
// couple's hand-entered rates { usdTry, eurTry, gold24Try, gold22Try,
// gold14Try } — TL per 1 USD / 1 EUR / 1 gram of gold at each karat (a legacy
// `goldGramTry` rate is treated as the 24-karat rate). A missing rate yields
// `null` values so callers can render a deliberate "no rate entered" state
// instead of a wrong number.

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
// `karat` is the customary purity pre-filled per subtype (coins/bracelets are
// 22, gram gold is 24) — editable in the form since bracelets/jewelry vary.
export const GOLD_TYPE_OPTIONS = [
  { value: 'ceyrek', label: 'Çeyrek', grams: 1.75, karat: 22 },
  { value: 'yarim', label: 'Yarım', grams: 3.5, karat: 22 },
  { value: 'tam', label: 'Tam', grams: 7, karat: 22 },
  { value: 'gram', label: 'Gram Altın', grams: 1, karat: 24 },
  { value: 'bilezik', label: 'Bilezik', grams: null, karat: 22 },
  { value: 'other', label: 'Diğer', grams: null, karat: 22 },
]

export function goldTypeLabel(value) {
  return GOLD_TYPE_OPTIONS.find((o) => o.value === value)?.label || ''
}

export function defaultGrams(goldType) {
  return GOLD_TYPE_OPTIONS.find((o) => o.value === goldType)?.grams ?? null
}

export const KARAT_OPTIONS = [
  { value: 24, label: '24 Ayar' },
  { value: 22, label: '22 Ayar' },
  { value: 14, label: '14 Ayar' },
]

// Per-karat TL rate keys in the gift settings doc.
export const GOLD_RATE_KEYS = { 24: 'gold24Try', 22: 'gold22Try', 14: 'gold14Try' }

export function defaultKarat(goldType) {
  return GOLD_TYPE_OPTIONS.find((o) => o.value === goldType)?.karat ?? 22
}

// A gift's karat, falling back to the subtype default for records created
// before karats existed.
export function giftKarat(gift) {
  const n = Number(gift?.karat)
  return GOLD_RATE_KEYS[n] ? n : defaultKarat(gift?.goldType)
}

// TL per 1 gram of gold at the given karat, or null when not entered. The
// legacy single `goldGramTry` rate counts as the 24-karat rate.
export function goldRateFor(karat, rates) {
  const raw = rates?.[GOLD_RATE_KEYS[karat]] ?? (karat === 24 ? rates?.goldGramTry : null)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

// The summary total can be shown in any of these units.
export const DISPLAY_OPTIONS = [
  { value: 'try', label: 'TL' },
  { value: 'usd', label: 'Dolar' },
  { value: 'eur', label: 'Euro' },
  { value: 'gold', label: 'Altın (g)' },
]

// TL per one unit of `currency` ('try'|'usd'|'eur'|'gold'), or null when the
// couple hasn't entered that rate yet. 'gold' means 1 gram of 24-karat gold —
// the unit the summary total's "Altın (g)" display converts through.
export function rateFor(currency, rates) {
  if (currency === 'try') return 1
  if (currency === 'gold') return goldRateFor(24, rates)
  const value = currency === 'usd' ? rates?.usdTry : rates?.eurTry
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

// A gift's worth in TL, or null when the needed rate is missing.
export function giftValueTry(gift, rates) {
  if (gift.kind === 'gold') {
    const rate = goldRateFor(giftKarat(gift), rates)
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

// Every attendee linked to a gift: the legacy single `rsvpId` (the person
// picked when the gift was entered) plus any `rsvpIds` contributors added later
// from the Katılımcılar tab — used when several guests pool one piece. Blanks
// dropped, de-duplicated.
export function giftRsvpIds(gift) {
  const ids = []
  if (gift?.rsvpId) ids.push(gift.rsvpId)
  if (Array.isArray(gift?.rsvpIds)) ids.push(...gift.rsvpIds)
  return [...new Set(ids.filter(Boolean))]
}

// Short human label of what was given: "2 × Çeyrek (22 ayar, 1,75 g)" / "$100".
export function giftSummaryLabel(gift) {
  if (gift.kind === 'gold') {
    return `${gift.count} × ${goldTypeLabel(gift.goldType)} (${giftKarat(gift)} ayar, ${formatNumber(gift.grams ?? 0, 2)} g)`
  }
  return formatValue(gift.amount ?? 0, gift.kind)
}
