import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { bubbleFacts, modeOf } from './requestMode'

const item = (over: Partial<Item>): Item =>
  ({ id: 'x', text: '', speech: '', answer: '0', choices: [], hints: ['', '', ''], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, ...over }) as unknown as Item

describe('requestMode', () => {
  it('plays small passenger items with real people', () => {
    const it8 = item({ text: '8 − 3 = ?', answer: '5', operands: { a: 8, b: 3, op: '-' } })
    expect(modeOf(it8).kind).toBe('seats')
    expect(bubbleFacts(it8)).toEqual({ icon: '🚶', number: '−3' })
  })

  it('plays a «go» road item by driving and shows how many stops', () => {
    const go = item({ text: '34 + 3 = ?', answer: '37', operands: { a: 34, b: 3, op: '+' } })
    expect(modeOf(go).kind).toBe('road')
    expect(bubbleFacts(go)).toEqual({ icon: '🚌', number: '+3' })
  })

  it('anything else uses the existing task panel and shows a question mark', () => {
    const other = item({ text: 'Quant fa 6 × 7?', answer: '42' })
    expect(modeOf(other).kind).toBe('panel')
    expect(bubbleFacts(other).number).toBe('?')
  })
})
