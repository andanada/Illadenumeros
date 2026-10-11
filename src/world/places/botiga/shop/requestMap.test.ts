import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { bubbleOf, carrierFor } from './requestMap'

const item = (over: Partial<Item>): Item =>
  ({ id: 'x1', skillId: 'A4', text: '3 + 4 = ?', speech: '', answer: '7', choices: [], hints: ['', '', ''], hintVisual: { kind: 'none' }, operands: { a: 3, b: 4, op: '+' }, ...over }) as Item

describe('requestMap', () => {
  it('shows the product and the sum (never the answer) for a basket item', () => {
    const b = bubbleOf(item({}))
    expect(b.number).toBe('3+4')
    expect(typeof b.icon).toBe('string')
    expect(bubbleOf(item({ text: '6 + ? = 10', answer: '4', operands: { a: 6, b: 4, op: '+' } })).number).toBe('6+?')
    expect(bubbleOf(item({ text: '12 − 5 = ?', answer: '7', operands: { a: 12, b: 5, op: '-' } })).number).toBe('12−5')
  })
  it('shows a coin, and no amount, for a change item', () => {
    const b = bubbleOf(item({ text: 'Quin canvi?', answer: '2 €', operands: { a: 5, b: 3, op: '-' } }))
    expect(b).toEqual({ icon: 'moneda-poble' })
  })
  it('falls back to a price tag', () => {
    expect(bubbleOf(item({ text: 'Compara', answer: '<', operands: undefined }))).toEqual({ icon: 'etiqueta-preu' })
  })
  it('keeps the named neighbour, else picks a stable customer', () => {
    expect(carrierFor('la-fatima', 'r1', ['la-fatima', 'en-kofi'])).toBe('la-fatima')
    const a = carrierFor('senyora-pilar', 'r1', ['la-fatima', 'en-kofi'])
    expect(a).toBe(carrierFor('senyora-pilar', 'r1', ['la-fatima', 'en-kofi']))
    expect(carrierFor('x', 'r', [])).toBeUndefined()
  })
})
