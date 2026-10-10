import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Item } from '../../../core/ambit/types'
import { expectedCount, pilePoints, progressSaid, requestTaskSpecSchema, supplyCount, taskState } from './requestTask'

const item = (answer: string, operands?: Item['operands']): Item =>
  ({ id: 'i', skillId: 's', text: '', speech: '', answer, choices: [], hints: ['', '', ''], ...(operands ? { operands } : {}) }) as unknown as Item

describe('requestTask logic', () => {
  it('expected count comes from the numeric answer, else the operands, else nothing', () => {
    expect(expectedCount(item('12', { a: 7, b: 5, op: '+' }))).toBe(12)
    expect(expectedCount(item('x', { a: 7, b: 5, op: '+' }))).toBe(12)
    expect(expectedCount(item('x', { a: 3, b: 4, op: '×' }))).toBe(12)
    expect(expectedCount(item('x', { a: 9, b: 4, op: '-' }))).toBe(5)
    expect(expectedCount(item('x', { a: 12, b: 4, op: ':' }))).toBe(3)
    expect(expectedCount(item('x', { a: 7, b: 2, op: ':' }))).toBeUndefined()
    expect(expectedCount(item('x', { a: 1, b: 2, op: '-' }))).toBeUndefined()
    expect(expectedCount(item('0,5'))).toBeUndefined()
    expect(expectedCount(item('0,5'), 4)).toBe(4)
  })

  it('maps the errand phase and the count to a task state', () => {
    expect(taskState('asking', 0)).toBe('empty')
    expect(taskState('asking', 3)).toBe('counting')
    expect(taskState('checking', 3)).toBe('checking')
    expect(taskState('thanks', 3)).toBe('done')
    expect(taskState('shown', 3)).toBe('shown')
  })

  it('supplies a couple of spares by default and validates specs', () => {
    expect(supplyCount(7, {})).toBe(9)
    expect(supplyCount(7, { supply: 7 })).toBe(7)
    expect(requestTaskSpecSchema.safeParse({ zone: '' }).success).toBe(false)
    expect(requestTaskSpecSchema.safeParse({ zone: 'cistella', giveTo: 'pilar' }).success).toBe(true)
  })

  it('property: piles have n distinct points on the floor', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), fc.double({ min: 0, max: 1, noNaN: true }), (n, x) => {
        const pts = pilePoints({ x, y: 0.8 }, n, 0.47)
        return pts.length === n && pts.every((p) => p.y >= 0.5 && p.y <= 0.97 && p.x >= 0.04 && p.x <= 0.96)
      }),
    )
    expect(progressSaid(7, 'a la cistella')).toBe('Ara hi ha 7 a la cistella.')
  })
})
