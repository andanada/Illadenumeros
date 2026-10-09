import { describe, expect, it } from 'vitest'
import { defaultAvatar, STARTER_WEARABLES } from '../characters'
import { buyFeedback, priceTag, unownedWorn, wardrobeOwned, wornIds } from './wardrobeLogic'

const base = defaultAvatar('blau', 'menta')

describe('wardrobeLogic', () => {
  it('owned = bought + the free starter set, without duplicates, never mutating the input', () => {
    const bought = ['camisa', 'samarreta']
    const owned = wardrobeOwned(bought)
    expect(owned).toEqual(expect.arrayContaining(['camisa', ...STARTER_WEARABLES]))
    expect(new Set(owned).size).toBe(owned.length)
    expect(bought).toEqual(['camisa', 'samarreta'])
  })

  it('lists every worn part id, accessory included', () => {
    expect(wornIds(base)).toEqual([base.hair.style, base.top.item, base.bottom.item, base.shoes.item, 'gorra'])
    expect(wornIds({ ...base, accessory: null })).toHaveLength(4)
  })

  it('a price tag only on priced clothes she does not own', () => {
    const owned = wardrobeOwned([])
    expect(priceTag('camisa', owned)).toBe(15)
    expect(priceTag('camisa', wardrobeOwned(['camisa']))).toBeUndefined()
    expect(priceTag('samarreta', owned)).toBeUndefined()
    expect(priceTag('no-existeix', owned)).toBeUndefined()
  })

  it('unownedWorn: parts being tried on that still need buying (what she started with is fine)', () => {
    const owned = wardrobeOwned([])
    const trying = { ...base, top: { item: 'camisa', color: 'coral' as const }, accessory: { item: 'corona', color: 'mango' as const } }
    expect(unownedWorn(trying, owned, base)).toEqual(['camisa', 'corona'])
    expect(unownedWorn(trying, wardrobeOwned(['camisa', 'corona']), base)).toEqual([])
    expect(unownedWorn(base, owned, base)).toEqual([])
  })

  it('friendly feedback for every purchase outcome', () => {
    expect(buyFeedback({ ok: true, charged: 15 }, 'Camisa')).toMatch(/Camisa.*armari/)
    expect(buyFeedback({ ok: false, reason: 'not-enough-coins' }, 'Camisa')).toBe('No tens prou monedes encara: fes encàrrecs!')
    expect(buyFeedback({ ok: false, reason: 'storage' }, 'Camisa')).toMatch(/torna-ho a provar/i)
  })
})
