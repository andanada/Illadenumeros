import { describe, expect, it } from 'vitest'
import { giveReaction } from './give'

describe('giveReaction', () => {
  it('loved items make a heart', () => {
    expect(giveReaction({ who: 'la Pilar', item: 'la poma', itemId: 'poma', loves: ['poma'] }).emote).toBe('cor')
  })
  it('is deterministic and always positive', () => {
    const a = giveReaction({ who: 'en Nyx', item: 'el plàtan', itemId: 'platan' })
    expect(a).toEqual(giveReaction({ who: 'en Nyx', item: 'el plàtan', itemId: 'platan' }))
    expect(['cor', 'riure', 'uau']).toContain(a.emote)
    expect(a.said.startsWith('En Nyx')).toBe(true)
  })
})
