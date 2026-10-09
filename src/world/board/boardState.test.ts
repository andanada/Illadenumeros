import { describe, expect, it } from 'vitest'
import type { CatalogEntry } from '../model/types'
import { boardStateSchema, isBoardDone, newBoardState, pickGift, recordSolved, remainingAt, remainingTotal } from './boardState'

const TASKS = [
  { place: 'recreatius', count: 1, kind: 'calentament', neighbour: 'en-kofi' },
  { place: 'botiga', count: 2, kind: 'repte', neighbour: 'senyora-pilar' },
] as const

describe('board progress', () => {
  it('counts down per place and the whole board, never mutating', () => {
    const start = Object.freeze(newBoardState('2026-10-09', TASKS))
    expect(remainingTotal(start)).toBe(3)
    const one = recordSolved(start, 'botiga')
    expect(start.done).toEqual({})
    expect(remainingAt(one, 'botiga')).toBe(1)
    expect(remainingTotal(one)).toBe(2)
    expect(isBoardDone(one)).toBe(false)
    const all = recordSolved(recordSolved(one, 'botiga'), 'recreatius')
    expect(isBoardDone(all)).toBe(true)
  })

  it('extra errands, or errands at a place not on the board, change nothing', () => {
    const full = recordSolved(recordSolved(newBoardState('2026-10-09', TASKS), 'botiga'), 'botiga')
    expect(recordSolved(full, 'botiga')).toBe(full)
    expect(recordSolved(full, 'casa')).toBe(full)
    expect(remainingAt(full, 'casa')).toBe(0)
  })

  it('an empty board is never "done" (nothing to celebrate)', () => {
    expect(isBoardDone(newBoardState('2026-10-09', []))).toBe(false)
  })

  it('the stored shape is validated', () => {
    expect(boardStateSchema.safeParse(newBoardState('2026-10-09', TASKS)).success).toBe(true)
    expect(boardStateSchema.safeParse({ day: 'ahir', tasks: [], done: {} }).success).toBe(false)
    expect(boardStateSchema.safeParse({ day: '2026-10-09', tasks: [], done: { botiga: -1 } }).success).toBe(false)
  })
})

describe('pickGift', () => {
  const entries: CatalogEntry[] = [
    { id: 'corona', kind: 'accessory', name: 'Corona', price: 60 },
    { id: 'samarreta', kind: 'top', name: 'Samarreta', price: 0 },
    { id: 'sofa', kind: 'furniture', name: 'Sofà', price: 20 },
    { id: 'pa', kind: 'food', name: 'Pa', price: 2 },
    { id: 'gat', kind: 'pet', name: 'Gat', price: 5 },
  ]

  it('picks a priced clothing item or furniture she does not own, the same for the same seed', () => {
    const gift = pickGift(entries, [], 7)
    expect(['corona', 'sofa']).toContain(gift?.id)
    expect(pickGift(entries, [], 7)).toEqual(gift)
    expect(pickGift(entries, ['corona'], 7)?.id).toBe('sofa')
  })

  it('nothing left to give: undefined', () => {
    expect(pickGift(entries, ['corona', 'sofa'], 3)).toBeUndefined()
  })
})
