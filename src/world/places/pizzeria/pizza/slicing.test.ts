import { describe, expect, it } from 'vitest'
import { makeItem, type Items } from '../../../sandbox/logic/itemsState'
import { cutterInHand, pizzasToSlice, slicePoint } from './slicing'

const floor = { t: 'floor', room: 'cuina', at: { x: 0.5, y: 0.7 } } as const
const pizza = (uid: string, at: number) => ({ ...makeItem(uid, 'pizza-cuita', floor), chain: { at } })

describe('slicing', () => {
  it('reads the cutter in somebody’s hand', () => {
    const items: Items = { c: makeItem('c', 'tallador-8', { t: 'held', by: 'laia' }) }
    expect(cutterInHand(items)).toBe(8)
    expect(cutterInHand({})).toBeUndefined()
  })
  it('slices only pizzas that reached the cut stage', () => {
    const items: Items = { a: pizza('a', 1), b: pizza('b', 0), c: makeItem('c', 'tallador-6', { t: 'held', by: 'laia' }) }
    expect(pizzasToSlice(items)).toEqual([{ uid: 'a', parts: 6, room: 'cuina', at: { x: 0.5, y: 0.7 } }])
  })
  it('lays slices in a ring that stays inside the stage', () => {
    const pts = Array.from({ length: 8 }, (_, i) => slicePoint({ x: 0.97, y: 0.95 }, i, 8))
    pts.forEach((p) => {
      expect(p.x).toBeLessThanOrEqual(0.95)
      expect(p.y).toBeLessThanOrEqual(0.96)
    })
    const mid = Array.from({ length: 8 }, (_, i) => slicePoint({ x: 0.5, y: 0.75 }, i, 8))
    expect(new Set(mid.map((p) => `${p.x}/${p.y}`)).size).toBe(8)
  })
})
