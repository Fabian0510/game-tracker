const STORAGE_KEY = 'realm-tracker:players'

function isValidPlayer(p) {
  return (
    p !== null &&
    typeof p === 'object' &&
    Number.isFinite(p.id) &&
    typeof p.name === 'string' &&
    Number.isFinite(p.health) &&
    Number.isFinite(p.shields) &&
    p.shields >= 0 &&
    (p.photo === null || (typeof p.photo === 'string' && p.photo.startsWith('data:image/')))
  )
}

// Returns the saved players, or null if nothing usable was saved.
export function loadPlayers(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY))
    if (!Array.isArray(parsed)) return null
    return parsed.filter(isValidPlayer)
  } catch {
    return null
  }
}

// Saves players; if photos push past the storage quota, falls back to saving without them.
export function savePlayers(players, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(players))
    return true
  } catch {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(players.map(p => ({ ...p, photo: null }))))
    } catch {
      // Storage unavailable (e.g. private mode) - the game still works, it just won't survive a reload.
    }
    return false
  }
}
