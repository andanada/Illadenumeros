import type { Item } from '../../core/ambit/types'
import { askFromText, canDeal, dealCaption, dealTo, dealtTotal, emptyPlates, fullPlates, isShared, nextPlate, planFromItem, remainingCandies } from './plateLogic'

const base: Item = {
  id: 'x',
  skillId: 'C6',
  text: '14 : 4 = ?',
  speech: '',
  answer: '3',
  choices: [{ value: '3' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['', '', ''],
  cpaStage: 'concret',
}

describe('plateLogic', () => {
  it('detects remainder questions from the text', () => {
    expect(askFromText('Quantes sobren?')).toBe('remainder')
    expect(askFromText('Quantes en toquen a cadascú?')).toBe('quotient')
  })
  it('plans from the share visual, operands or falls back to plain', () => {
    expect(planFromItem({ ...base, visual: { kind: 'share', total: 14, groups: 4 } })).toEqual({ mode: 'deal', total: 14, groups: 4, ask: 'quotient' })
    expect(planFromItem({ ...base, operands: { a: 12, b: 3, op: ':' }, text: 'Sobren?' })).toEqual({ mode: 'deal', total: 12, groups: 3, ask: 'remainder' })
    expect(planFromItem({ ...base, operands: { a: 12, b: 1, op: ':' } })).toEqual({ mode: 'plain' })
    expect(planFromItem(base)).toEqual({ mode: 'plain' })
  })
  it('keeps grouping problems (one plate per box) as plain', () => {
    expect(planFromItem({ ...base, visual: { kind: 'share', total: 12, groups: 4 }, operands: { a: 12, b: 3, op: ':' } })).toEqual({ mode: 'plain' })
  })
  it('deals one by one and keeps it fair', () => {
    let plates: readonly number[] = emptyPlates(3)
    expect(canDeal(plates, 1)).toBe(true)
    plates = dealTo(plates, 1, 7)
    expect(plates).toEqual([0, 1, 0])
    expect(canDeal(plates, 1)).toBe(false)
    expect(dealTo(plates, 1, 7)).toBe(plates)
    expect(nextPlate(plates)).toBe(0)
  })
  it('does not deal more than the total', () => {
    const plates = [2, 2]
    expect(dealTo(plates, 0, 4)).toBe(plates)
  })
  it('finishes with the leftover aside and stops dealing', () => {
    let plates: readonly number[] = emptyPlates(3)
    for (let i = 0; i < 5; i++) plates = dealTo(plates, nextPlate(plates), 8)
    expect(plates).toEqual([2, 2, 1])
    expect(isShared(plates, 8)).toBe(false)
    plates = dealTo(plates, nextPlate(plates), 8)
    expect(plates).toEqual([2, 2, 2])
    expect(remainingCandies(plates, 8)).toBe(2)
    expect(isShared(plates, 8)).toBe(true)
    expect(dealTo(plates, 0, 8)).toBe(plates)
    expect(dealtTotal(plates)).toBe(6)
  })
  it('computes the end state and captions', () => {
    expect(fullPlates(14, 4)).toEqual([3, 3, 3, 3])
    expect(dealCaption([3, 3, 3, 3], 14)).toBe('Tot repartit! En sobren 2')
    expect(dealCaption([3, 3, 3], 9)).toBe('Tot repartit! No en sobra cap')
    expect(dealCaption([1, 0], 5)).toBe('Et queden 4 per repartir')
  })
})
