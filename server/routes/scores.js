import { Router } from 'express'
import { nanoid } from 'nanoid'
import { readCollection, updateCollection } from '../lib/collections.js'
import { GAME_IDS } from '../lib/gameIds.js'

// Game scoreboard. Each finished game submits one entry; the games hub and the
// end screens read the board back. `score` is a number (higher is better) and
// `label` is the human-readable result (e.g. "6/8 doğru", "12 hamle · 0:45").
export const scoresRouter = Router()

const GAMES = GAME_IDS

// GET /api/scores  → all entries, newest first (capped).
scoresRouter.get('/', async (_req, res, next) => {
  try {
    const scores = [...(await readCollection('scores'))]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 500)
    res.json({ scores })
  } catch (e) {
    next(e)
  }
})

// POST /api/scores  { game, score, label, uploaderId, displayName }
scoresRouter.post('/', async (req, res, next) => {
  try {
    const { game, score, label, detail, uploaderId, displayName } = req.body || {}
    if (!GAMES.has(game)) return res.status(400).json({ error: 'unknown game' })
    const entry = {
      id: nanoid(12),
      game,
      score: Number(score) || 0,
      label: String(label || '').slice(0, 60),
      // Optional per-game breakdown for the admin view (e.g. quiz answers).
      detail: Array.isArray(detail) ? detail.slice(0, 50) : detail || null,
      displayName: String(displayName || 'Misafir').slice(0, 60),
      uploaderId: uploaderId || 'anon',
      createdAt: new Date().toISOString(),
    }
    await updateCollection('scores', (scores) => scores.push(entry))
    res.status(201).json(entry)
  } catch (e) {
    next(e)
  }
})
