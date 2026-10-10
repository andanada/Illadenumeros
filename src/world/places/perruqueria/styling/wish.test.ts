import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { wishOf } from './wish'

const item = (over: Partial<Item>): Item =>
  ({ id: 'p1', skillId: 'A4', text: '3 + 4 = ?', speech: '', answer: '7', choices: [], hints: ['', '', ''], hintVisual: { kind: 'none' }, operands: { a: 3, b: 4, op: '+' }, ...over }) as Item

describe('wishOf', () => {
  it('asks for as many clips as the answer', () => {
    expect(wishOf(item({}))).toEqual({ clips: true, number: 7 })
    expect(wishOf(item({ text: '5 + ? = 8', answer: '3', operands: { a: 5, b: 3, op: '+' } }))).toEqual({ clips: true, number: 3 })
  })
  it('falls back to a price tag for other items', () => {
    expect(wishOf(item({ text: 'Compara', answer: '<', operands: undefined }))).toEqual({ clips: false })
  })
})
