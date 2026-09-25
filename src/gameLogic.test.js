import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  STARTING_HEALTH,
  applyHealthChange,
  applyShieldChange,
  createPlayer,
  describeChange,
  getHealthTier,
  isShieldShattered,
  nextPlayerId,
  resetPlayer,
} from './gameLogic.js'

const player = (health, shields = 0) => ({ ...createPlayer(1), health, shields })

describe('createPlayer / nextPlayerId', () => {
  it('creates a player at starting health with no shields or photo', () => {
    assert.deepEqual(createPlayer(3), { id: 3, name: 'Player 3', health: STARTING_HEALTH, shields: 0, photo: null })
    assert.equal(STARTING_HEALTH, 10)
  })

  it('picks one more than the highest existing id', () => {
    assert.equal(nextPlayerId([]), 1)
    assert.equal(nextPlayerId([{ id: 1 }, { id: 5 }, { id: 2 }]), 6)
  })
})

describe('applyHealthChange', () => {
  it('heals health without touching shields', () => {
    assert.deepEqual(applyHealthChange(player(5, 2), 3), player(8, 2))
  })

  it('damages health directly when there are no shields', () => {
    assert.deepEqual(applyHealthChange(player(5), -2), player(3))
  })

  it('lets shields fully absorb damage', () => {
    assert.deepEqual(applyHealthChange(player(5, 3), -2), player(5, 1))
    assert.deepEqual(applyHealthChange(player(5, 3), -3), player(5, 0))
  })

  it('passes damage beyond the shields through to health', () => {
    assert.deepEqual(applyHealthChange(player(5, 2), -5), player(2, 0))
  })

  it('allows health to drop below zero', () => {
    assert.deepEqual(applyHealthChange(player(1), -3), player(-2))
  })

  it('does not mutate the original player', () => {
    const original = player(5, 2)
    applyHealthChange(original, -4)
    assert.deepEqual(original, player(5, 2))
  })
})

describe('applyShieldChange', () => {
  it('adds and removes shields', () => {
    assert.equal(applyShieldChange(player(5, 1), 3).shields, 4)
    assert.equal(applyShieldChange(player(5, 4), -1).shields, 3)
  })

  it('never goes below zero', () => {
    assert.equal(applyShieldChange(player(5, 0), -1).shields, 0)
    assert.equal(applyShieldChange(player(5, 1), -3).shields, 0)
  })
})

describe('resetPlayer', () => {
  it('restores health and clears shields but keeps identity', () => {
    const p = { id: 2, name: 'Aria', health: -1, shields: 4, photo: 'data:image/jpeg;base64,x' }
    assert.deepEqual(resetPlayer(p), { ...p, health: STARTING_HEALTH, shields: 0 })
  })
})

describe('getHealthTier', () => {
  it('maps health to the documented thresholds', () => {
    assert.equal(getHealthTier(-3), 'defeated')
    assert.equal(getHealthTier(0), 'defeated')
    assert.equal(getHealthTier(1), 'critical')
    assert.equal(getHealthTier(3), 'critical')
    assert.equal(getHealthTier(4), 'warning')
    assert.equal(getHealthTier(6), 'warning')
    assert.equal(getHealthTier(7), 'healthy')
    assert.equal(getHealthTier(15), 'healthy')
  })
})

describe('describeChange', () => {
  const s = (health, shields = 0) => ({ health, shields })

  it('reports death when health crosses to zero or below', () => {
    assert.deepEqual(describeChange(s(1), s(0)), { type: 'death', label: 'DEFEATED' })
    assert.deepEqual(describeChange(s(2, 1), s(-1, 0)), { type: 'death', label: 'DEFEATED' })
  })

  it('reports plain damage once already defeated', () => {
    assert.deepEqual(describeChange(s(0), s(-1)), { type: 'damage', label: '-1' })
  })

  it('reports damage and healing amounts', () => {
    assert.deepEqual(describeChange(s(8), s(5)), { type: 'damage', label: '-3' })
    assert.deepEqual(describeChange(s(5), s(7)), { type: 'heal', label: '+2' })
  })

  it('reports partial shield loss', () => {
    assert.deepEqual(describeChange(s(5, 3), s(5, 1)), { type: 'shield-break', label: '-2' })
  })

  it('reports a shatter when the last shields are lost', () => {
    assert.deepEqual(describeChange(s(5, 1), s(5, 0)), { type: 'shatter', label: 'SHATTERED' })
    assert.deepEqual(describeChange(s(5, 4), s(5, 0)), { type: 'shatter', label: 'SHATTERED' })
  })

  it('prefers the health effect when shields and health both drop', () => {
    assert.deepEqual(describeChange(s(5, 1), s(3, 0)), { type: 'damage', label: '-2' })
  })

  it('reports nothing for shield gains or no change', () => {
    assert.equal(describeChange(s(5, 0), s(5, 0)), null)
    assert.equal(describeChange(s(5, 0), s(5, 3)), null)
    assert.equal(describeChange(s(5, 1), s(5, 1)), null)
  })
})

describe('isShieldShattered', () => {
  const s = (health, shields = 0) => ({ health, shields })

  it('is true only when shields drop from some to none', () => {
    assert.equal(isShieldShattered(s(5, 1), s(5, 0)), true)
    assert.equal(isShieldShattered(s(5, 3), s(2, 0)), true)
    assert.equal(isShieldShattered(s(5, 3), s(5, 1)), false)
    assert.equal(isShieldShattered(s(5, 0), s(4, 0)), false)
    assert.equal(isShieldShattered(s(5, 0), s(5, 2)), false)
  })
})
