// Couple-name helpers shared by features that generate artifacts (calendar
// files, identifiers) from the live wedding details. Keeping the slug logic
// here means a fork only edits the couple names in the admin and every derived
// string follows.

// Turkish-aware kebab slug, mirroring server/storage/shared.js.
function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    (text || '')
      .toLowerCase()
      .replace(/[çğıİöşü]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'wedding'
  )
}

// "esra-omer" for { bride: 'Esra', groom: 'Ömer' }.
export function coupleSlug(w) {
  return `${slugify(w?.bride)}-${slugify(w?.groom)}`
}
