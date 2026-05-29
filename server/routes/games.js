import { Router } from 'express'
import { storage } from '../storage/index.js'

// Public, read-only game content the games fetch at runtime. When the couple
// edits the quiz in the admin, it is served from here; games fall back to their
// bundled defaults when nothing is stored yet.
export const gamesRouter = Router()

gamesRouter.get('/content', async (_req, res, next) => {
  try {
    res.json(await storage.getDoc('game_content'))
  } catch (e) {
    next(e)
  }
})
