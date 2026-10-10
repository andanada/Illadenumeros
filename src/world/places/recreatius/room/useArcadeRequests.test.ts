import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import type { PlaceRequest } from '../../../requests/useRequests'
import { bubblesFor, clerkNumber, waitingCount } from './useArcadeRequests'

const req = (status: 'waiting' | 'calm'): PlaceRequest => ({ id: status, placeId: 'recreatius', kind: 'play', actorId: 'en-kofi', createdAt: 0, expiresSoft: 1, status })

describe('arcade requests', () => {
  it('counts the store waiting needs, or the pending of the shell when the store is empty', () => {
    expect(waitingCount([req('waiting'), req('calm')], 5)).toBe(1)
    expect(waitingCount([], 2)).toBe(2)
    expect(waitingCount([req('calm')], 3)).toBe(0)
  })

  it('the first need lights the Duel and the second is the clerk\'s', () => {
    expect(bubblesFor(0)).toEqual({ warm: false, clerk: false })
    expect(bubblesFor(1)).toEqual({ warm: true, clerk: false })
    expect(bubblesFor(2)).toEqual({ warm: true, clerk: true })
  })

  it('the clerk shows the operation, never the answer', () => {
    const base = { text: '', answer: '12' } as unknown as Item
    expect(clerkNumber({ ...base, operands: { a: 7, b: 5, op: '+' } } as Item)).toBe('7+5')
    expect(clerkNumber({ ...base, operands: { a: 9, b: 4, op: '-' } } as Item)).toBe('9−4')
    expect(clerkNumber(base)).toBe('?')
  })
})
