import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { loadPlayers, savePlayers } from './storage.js'

function fakeStorage({ quota = Infinity } = {}) {
  const data = new Map()
  return {
    data,
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      if (value.length > quota) throw new Error('QuotaExceededError')
      data.set(key, value)
    },
  }
}

const hero = { id: 1, name: 'Aria', health: 7, shields: 2, photo: 'data:image/jpeg;base64,abc' }

describe('loadPlayers', () => {
  it('returns null when nothing is saved', () => {
    assert.equal(loadPlayers(fakeStorage()), null)
  })

  it('returns null for corrupt or non-array data', () => {
    const storage = fakeStorage()
    storage.setItem('realm-tracker:players', '{not json')
    assert.equal(loadPlayers(storage), null)
    storage.setItem('realm-tracker:players', '{"id":1}')
    assert.equal(loadPlayers(storage), null)
  })

  it('round-trips saved players, including an empty roster', () => {
    const storage = fakeStorage()
    savePlayers([hero], storage)
    assert.deepEqual(loadPlayers(storage), [hero])
    savePlayers([], storage)
    assert.deepEqual(loadPlayers(storage), [])
  })

  it('drops malformed players', () => {
    const storage = fakeStorage()
    storage.setItem('realm-tracker:players', JSON.stringify([
      hero,
      { ...hero, id: 'two' },
      { ...hero, id: 3, shields: -1 },
      { ...hero, id: 4, photo: 'javascript:alert(1)' },
      null,
    ]))
    assert.deepEqual(loadPlayers(storage), [hero])
  })

  it('returns null when storage itself throws', () => {
    const storage = { getItem: () => { throw new Error('SecurityError') } }
    assert.equal(loadPlayers(storage), null)
  })
})

describe('savePlayers', () => {
  it('falls back to saving without photos when over quota', () => {
    const storage = fakeStorage({ quota: 250 })
    assert.equal(savePlayers([hero, { ...hero, id: 2, photo: `data:image/jpeg;base64,${'x'.repeat(200)}` }], storage), false)
    assert.deepEqual(loadPlayers(storage), [{ ...hero, photo: null }, { ...hero, id: 2, photo: null }])
  })

  it('does not throw when storage is unavailable', () => {
    const storage = { setItem: () => { throw new Error('SecurityError') } }
    assert.equal(savePlayers([hero], storage), false)
  })
})
