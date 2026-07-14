import { Router } from 'express'
import { nanoid } from 'nanoid'
import { updateCollection } from '../lib/collections.js'

// RSVP submissions are appended to a single JSON collection the couple reads.
export const rsvpRouter = Router()

rsvpRouter.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, attending, guests, children } = req.body || {}
    if (!firstName) {
      return res.status(400).json({ error: 'firstName is required' })
    }
    await updateCollection('rsvp', (entries) =>
      entries.push({
        id: nanoid(10),
        firstName: String(firstName).trim(),
        lastName: String(lastName || '').trim(),
        attending: attending === false ? false : true,
        guests: Number(guests) || 1,
        children: Number(children) || 0,
        createdAt: new Date().toISOString(),
      }),
    )
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})
