import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { cutFromItem, cutWords, fractionMade, sliceSpan } from './cutLogic'

const item = (over: Partial<Item> = {}): Item =>
  ({ id: 'x', skillId: 'C8', text: 'Quina part està pintada?', speech: '', answer: '3/8', choices: [], hints: ['', '', ''], visual: { kind: 'fraction', parts: 8, selected: 3 }, hintVisual: { kind: 'fraction', parts: 8, selected: 3 }, cpaStage: 'concret', ...over }) as Item

describe('cutFromItem', () => {
  it('maps a painted part of a whole to cut and give', () => {
    expect(cutFromItem(item())).toEqual({ parts: 8, selected: 3 })
  })
  it('leaves collections, other skills and odd cuts alone', () => {
    expect(cutFromItem(item({ hintVisual: { kind: 'fraction', parts: 4, selected: 1, collection: 12 } }))).toBeUndefined()
    expect(cutFromItem(item({ skillId: 'E9' }))).toBeUndefined()
    expect(cutFromItem(item({ hintVisual: { kind: 'fraction', parts: 7, selected: 3 }, answer: '3/7' }))).toBeUndefined()
  })
})

describe('cut and give', () => {
  it('builds the fraction from what she did', () => {
    expect(fractionMade(3, 8)).toBe('3/8')
  })
  it('splits the circle evenly', () => {
    expect(sliceSpan(4, 1)).toEqual({ from: 90, to: 180 })
  })
  it('words the request', () => {
    expect(cutWords({ parts: 8, selected: 3 }, 'a la Fàtima')).toBe('Talla la pizza en 8 parts iguals i dóna’n 3 a la Fàtima.')
  })
})
