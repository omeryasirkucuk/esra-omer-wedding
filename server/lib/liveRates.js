// Live market rates for the gift ledger. One provider — Truncgil's public
// Turkish finance feed (finans.truncgil.com) — returns USD, EUR and per-karat
// gram gold prices already in TL, including the local jeweller premium. So the
// couple's "refresh" button lands the same numbers a Turkish gold shop quotes
// rather than a spot price computed from an ounce. Every value is the "Selling"
// (satış) side — the headline price both currencies and gram gold are quoted
// at, and the only side the plain gram-gold entry (GRA) publishes.

const SOURCE_URL = 'https://finans.truncgil.com/v4/today.json'
const SOURCE_LABEL = 'Truncgil'

// Provider keys → our gift_settings rate keys. GRA = 24-karat gram gold, YIA =
// the 22-karat bracelet gram, 14AYARALTIN = 14-karat gram; USD/EUR are TL per
// unit. Anything not listed here is ignored.
const FIELD_MAP = {
  usdTry: 'USD',
  eurTry: 'EUR',
  gold24Try: 'GRA',
  gold22Try: 'YIA',
  gold14Try: '14AYARALTIN',
}

// Positive finite number, else null — an unusable quote never becomes NaN or a
// zero that would read as a real (free) rate downstream.
function toRate(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Fetch the live rates, or throw when the provider is unreachable / unusable.
// Returns only the fields that came back as positive numbers, so the caller can
// merge them over the existing hand-entered rates — a momentarily-missing field
// then keeps its previous value instead of being wiped. `updatedAt` is the
// provider's own quote timestamp, surfaced to the admin as a freshness hint.
export async function fetchLiveRates({ timeoutMs = 10000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let data
  try {
    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`rate provider responded ${res.status}`)
    data = await res.json()
  } finally {
    clearTimeout(timer)
  }

  const rates = {}
  for (const [rateKey, srcKey] of Object.entries(FIELD_MAP)) {
    const rate = toRate(data?.[srcKey]?.Selling)
    if (rate != null) rates[rateKey] = rate
  }
  if (Object.keys(rates).length === 0) {
    throw new Error('rate provider returned no usable rates')
  }
  return { rates, source: SOURCE_LABEL, updatedAt: data?.Update_Date || null }
}
