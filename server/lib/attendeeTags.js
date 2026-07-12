// Attendee tag vocabulary shared by the RSVP and gift admin routes. `group` is
// the social circle; `side` is which of the couple the person belongs to
// (gelin = bride, damat = groom, cift = both). Anything outside these sets
// (including '') is stored as '' = untagged.
export const RSVP_GROUPS = new Set(['aile', 'arkadas', 'akraba', 'is'])
export const RSVP_SIDES = new Set(['gelin', 'damat', 'cift'])

export const cleanTag = (value, allowed) => (allowed.has(value) ? value : '')

// Free-text custom label (e.g. "iş - üniversiteden", "aile - gelin tarafı").
export const cleanNote = (value) => String(value || '').trim().slice(0, 200)
