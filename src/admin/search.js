// Shared name-search helpers for the admin panels. Search is intentionally
// forgiving: case-insensitive, accent/Turkish-letter folded, and substring-based
// (no exact match). A multi-word query matches when EVERY word appears somewhere
// in the combined fields, so "ali yilmaz" and "yilmaz ali" both find "Ali Yılmaz".

// Lowercase and fold Turkish-specific letters to their ASCII base so a query
// typed without diacritics (or with the wrong dotted/dotless i) still matches.
export function normalizeText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .trim()
}

// Locale-aware A→Z comparison of two names (Turkish collation, accent-folded so
// the ordering matches what the forgiving search considers equal).
export function compareNames(a, b) {
  return normalizeText(a).localeCompare(normalizeText(b), 'tr')
}

// Newest-first comparison of two ISO/date-ish values (missing dates sort last).
export function compareNewest(a, b) {
  return (Date.parse(b) || 0) - (Date.parse(a) || 0)
}

// True when every whitespace-separated word in `query` is a substring of the
// normalized, combined `fields`. An empty/whitespace query matches everything.
export function matchesQuery(query, ...fields) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fields.map((f) => normalizeText(f)).join(' ')
  return words.every((w) => haystack.includes(w))
}
