// The canonical set of guest-facing game ids (route segments under /oyunlar).
// Shared by the score whitelist and the admin enable/disable toggle so the
// list can't drift between them. The client keeps its own registries (tiles,
// route components) keyed by these same ids.
export const GAME_IDS = new Set(['eslestirme', 'cifti-tani', 'foto-tahmin', 'yapboz', 'kim-demis'])
