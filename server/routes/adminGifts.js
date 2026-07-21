// "Hediye" tab endpoints: the wedding gift ledger. Each record is ONE gift item
// — cash in TRY/USD/EUR or gold pieces (subtype + karat + piece count + grams
// per piece). A record may link to an RSVP entry via `rsvpId` (set when the
// admin picks the person from the attendee list) or stand alone with a
// free-text name. Conversion rates the couple types in by hand live in the
// `gift_settings` doc: { usdTry, eurTry, gold24Try, gold22Try, gold14Try } =
// TL per 1 USD / 1 EUR / 1 gram of gold at each karat (a legacy `goldGramTry`
// value migrates to `gold24Try` on save). Mounted after the admin auth gate,
// so every route inherits it.
import { Router } from 'express'
import { nanoid } from 'nanoid'
import { storage } from '../storage/index.js'
import { RSVP_GROUPS, RSVP_SIDES, cleanTag, cleanNote } from '../lib/attendeeTags.js'

const GIFT_KINDS = new Set(['try', 'usd', 'eur', 'gold'])
const GOLD_TYPES = new Set(['gram', 'ceyrek', 'yarim', 'tam', 'bilezik', 'other'])
const GOLD_KARATS = new Set([14, 22, 24])
// Customary purity per subtype, used when the client sends no/invalid karat.
const DEFAULT_KARAT = { gram: 24 }
const toKarat = (value, goldType) => {
  const n = Math.trunc(Number(value))
  return GOLD_KARATS.has(n) ? n : DEFAULT_KARAT[goldType] ?? 22
}

// Positive finite number, else 0 (invalid input never becomes NaN in storage).
const toAmount = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}
// Positive integer piece count, else 0.
const toPieces = (value) => {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 0
}
// A conversion rate: positive finite number, else null = "not entered yet".
const toRate = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
// A list of attendee ids: trimmed, non-empty, de-duplicated.
const toIdList = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))]
    : []

export const adminGiftsRouter = Router()

adminGiftsRouter.get('/gifts', async (req, res, next) => {
  try {
    const gifts = await storage.getCollection('gifts')
    gifts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    res.json({ gifts })
  } catch (e) {
    next(e)
  }
})

adminGiftsRouter.post('/gifts', async (req, res, next) => {
  try {
    const { name, rsvpId, kind, amount, goldType, karat, count, grams, group, side, note } =
      req.body || {}
    const cleanName = String(name || '').trim()
    if (!cleanName) return res.status(400).json({ error: 'name required' })
    if (!GIFT_KINDS.has(kind)) return res.status(400).json({ error: 'invalid kind' })

    const gold = kind === 'gold'
    if (gold) {
      if (!GOLD_TYPES.has(goldType)) return res.status(400).json({ error: 'invalid gold type' })
      if (!toPieces(count)) return res.status(400).json({ error: 'count required' })
      if (!toAmount(grams)) return res.status(400).json({ error: 'grams required' })
    } else if (!toAmount(amount)) {
      return res.status(400).json({ error: 'amount required' })
    }

    const gifts = await storage.getCollection('gifts')
    const entry = {
      id: nanoid(10),
      name: cleanName,
      // Link to the attendee record when the admin picked one from the list.
      rsvpId: typeof rsvpId === 'string' ? rsvpId.trim() : '',
      // Extra contributors linked later from the Katılımcılar tab (collective
      // gifts pooled by several guests). The picked person stays in `rsvpId`.
      rsvpIds: [],
      kind,
      amount: gold ? 0 : toAmount(amount),
      goldType: gold ? goldType : '',
      karat: gold ? toKarat(karat, goldType) : 0,
      count: gold ? toPieces(count) : 0,
      grams: gold ? toAmount(grams) : 0, // grams PER PIECE; total = count × grams
      group: cleanTag(group, RSVP_GROUPS),
      side: cleanTag(side, RSVP_SIDES),
      note: cleanNote(note),
      createdAt: new Date().toISOString(),
    }
    gifts.push(entry)
    await storage.saveCollection('gifts', gifts)
    res.status(201).json(entry)
  } catch (e) {
    next(e)
  }
})

// Edit a gift item. Two shapes:
//  - Partial inline edits (no `kind` in the body): individual number/tag/note
//    fields, constrained to the entry's current kind — the quick in-list edits.
//  - Full re-specification (with `kind`): the inline editor may change the kind
//    (TL/Dolar/Euro/Altın) and gold subtype/karat, so the whole value shape is
//    re-derived and validated like a create. The attendee links (rsvpId/
//    rsvpIds) are never touched here — those live on the Katılımcılar tab.
adminGiftsRouter.post('/gifts/update', async (req, res, next) => {
  try {
    const { id, name, kind, amount, goldType, karat, count, grams, group, side, note, rsvpIds } =
      req.body || {}
    const gifts = await storage.getCollection('gifts')
    const entry = gifts.find((g) => g.id === id)
    if (!entry) return res.status(404).json({ error: 'not found' })

    // Validate the full re-spec up front, before mutating anything, so an
    // invalid payload can't leave the entry half-changed.
    let valueUpdate = null
    if (kind !== undefined) {
      if (!GIFT_KINDS.has(kind)) return res.status(400).json({ error: 'invalid kind' })
      const gold = kind === 'gold'
      if (gold) {
        if (!GOLD_TYPES.has(goldType)) return res.status(400).json({ error: 'invalid gold type' })
        if (!toPieces(count)) return res.status(400).json({ error: 'count required' })
        if (!toAmount(grams)) return res.status(400).json({ error: 'grams required' })
      } else if (!toAmount(amount)) {
        return res.status(400).json({ error: 'amount required' })
      }
      valueUpdate = {
        kind,
        amount: gold ? 0 : toAmount(amount),
        goldType: gold ? goldType : '',
        karat: gold ? toKarat(karat, goldType) : 0,
        count: gold ? toPieces(count) : 0,
        grams: gold ? toAmount(grams) : 0,
      }
    }

    if (name !== undefined) entry.name = String(name).trim() || entry.name
    if (valueUpdate) {
      Object.assign(entry, valueUpdate)
    } else {
      if (amount !== undefined && entry.kind !== 'gold') entry.amount = toAmount(amount)
      if (count !== undefined && entry.kind === 'gold') entry.count = toPieces(count)
      if (grams !== undefined && entry.kind === 'gold') entry.grams = toAmount(grams)
    }
    if (group !== undefined) entry.group = cleanTag(group, RSVP_GROUPS)
    if (side !== undefined) entry.side = cleanTag(side, RSVP_SIDES)
    if (note !== undefined) entry.note = cleanNote(note)
    if (rsvpIds !== undefined) entry.rsvpIds = toIdList(rsvpIds)
    await storage.saveCollection('gifts', gifts)
    res.json(entry)
  } catch (e) {
    next(e)
  }
})

// Add one attendee as a contributor to a gift (from the Katılımcılar tab). The
// picked person stays in `rsvpId`; everyone else accumulates in `rsvpIds`.
adminGiftsRouter.post('/gifts/link', async (req, res, next) => {
  try {
    const { id, rsvpId } = req.body || {}
    const attendee = String(rsvpId || '').trim()
    if (!attendee) return res.status(400).json({ error: 'rsvpId required' })
    const gifts = await storage.getCollection('gifts')
    const entry = gifts.find((g) => g.id === id)
    if (!entry) return res.status(404).json({ error: 'not found' })
    const ids = new Set(Array.isArray(entry.rsvpIds) ? entry.rsvpIds : [])
    if (attendee !== entry.rsvpId) ids.add(attendee)
    entry.rsvpIds = [...ids]
    await storage.saveCollection('gifts', gifts)
    res.json(entry)
  } catch (e) {
    next(e)
  }
})

// Remove one attendee from a gift's contributors (clears `rsvpId` too when it
// was the picked person, so the star drops for them).
adminGiftsRouter.post('/gifts/unlink', async (req, res, next) => {
  try {
    const { id, rsvpId } = req.body || {}
    const attendee = String(rsvpId || '').trim()
    const gifts = await storage.getCollection('gifts')
    const entry = gifts.find((g) => g.id === id)
    if (!entry) return res.status(404).json({ error: 'not found' })
    if (entry.rsvpId === attendee) entry.rsvpId = ''
    entry.rsvpIds = (Array.isArray(entry.rsvpIds) ? entry.rsvpIds : []).filter(
      (v) => v !== attendee,
    )
    await storage.saveCollection('gifts', gifts)
    res.json(entry)
  } catch (e) {
    next(e)
  }
})

adminGiftsRouter.post('/gifts/delete', async (req, res, next) => {
  try {
    const { id } = req.body || {}
    const gifts = await storage.getCollection('gifts')
    const remaining = gifts.filter((g) => g.id !== id)
    if (remaining.length === gifts.length) return res.status(404).end()
    await storage.saveCollection('gifts', remaining)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Hand-entered conversion rates used by the panel to total mixed gifts.
adminGiftsRouter.get('/gifts/settings', async (req, res, next) => {
  try {
    res.json((await storage.getDoc('gift_settings')) || {})
  } catch (e) {
    next(e)
  }
})

adminGiftsRouter.put('/gifts/settings', async (req, res, next) => {
  try {
    const { usdTry, eurTry, goldGramTry, gold14Try, gold22Try, gold24Try } = req.body || {}
    const doc = {
      usdTry: toRate(usdTry),
      eurTry: toRate(eurTry),
      gold24Try: toRate(gold24Try ?? goldGramTry),
      gold22Try: toRate(gold22Try),
      gold14Try: toRate(gold14Try),
    }
    await storage.saveDoc('gift_settings', doc)
    res.json(doc)
  } catch (e) {
    next(e)
  }
})
