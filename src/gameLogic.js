export const STARTING_HEALTH = 10

export function createPlayer(id) {
  return { id, name: `Player ${id}`, health: STARTING_HEALTH, shields: 0, photo: null }
}

export function nextPlayerId(players) {
  return Math.max(0, ...players.map(p => p.id)) + 1
}

// Damage (negative amount) is absorbed by shields first; healing only affects health.
export function applyHealthChange(player, amount) {
  if (amount >= 0) {
    return { ...player, health: player.health + amount }
  }

  const damage = -amount
  const absorbed = Math.min(player.shields, damage)
  return {
    ...player,
    shields: player.shields - absorbed,
    health: player.health - (damage - absorbed),
  }
}

export function applyShieldChange(player, amount) {
  return { ...player, shields: Math.max(0, player.shields + amount) }
}

export function resetPlayer(player) {
  return { ...player, health: STARTING_HEALTH, shields: 0 }
}

export function getHealthTier(health) {
  if (health <= 0) return 'defeated'
  if (health <= 3) return 'critical'
  if (health <= 6) return 'warning'
  return 'healthy'
}

// Describes the visual effect to play when a player's stats change, or null for none.
export function describeChange(prev, next) {
  const healthDiff = next.health - prev.health
  const shieldsDiff = next.shields - prev.shields

  if (prev.health > 0 && next.health <= 0) return { type: 'death', label: 'DEFEATED' }
  if (healthDiff < 0) return { type: 'damage', label: `${healthDiff}` }
  if (healthDiff > 0) return { type: 'heal', label: `+${healthDiff}` }
  if (isShieldShattered(prev, next)) return { type: 'shatter', label: 'SHATTERED' }
  if (shieldsDiff < 0) return { type: 'shield-break', label: `${shieldsDiff}` }
  return null
}

// True when the last of a player's shields is lost - plays the barrier-shatter effect,
// even if the same hit also carried through to health.
export function isShieldShattered(prev, next) {
  return prev.shields > 0 && next.shields === 0
}
