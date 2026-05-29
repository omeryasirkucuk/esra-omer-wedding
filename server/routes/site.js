import { Router } from 'express'
import { storage } from '../storage/index.js'

// Public, read-only site content (couple names, date, venue, program, quote,
// families). Edited by the couple in the admin; the guest site reads it live
// and falls back to its bundled defaults when nothing is stored yet.
export const siteRouter = Router()

siteRouter.get('/content', async (_req, res, next) => {
  try {
    res.json(await storage.getDoc('site_content'))
  } catch (e) {
    next(e)
  }
})
