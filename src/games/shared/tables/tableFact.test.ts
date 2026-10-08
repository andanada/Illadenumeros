import fc from 'fast-check'
import type { Item } from '../../../core/ambit/types'
import { groupsOf, isTrivial, levelOf, multiples, repeatedSum, tableFactOf } from './tableFact'

const base: Item = { id: 'x', skillId: 'C4', text: '', speech: '', answer: '', choices: [], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['', '', ''], cpaStage: 'concret' }

describe('tableFact', () => {
  it('reads multiplications and exact divisions', () => {
    expect(tableFactOf({ ...base, operands: { a: 3, b: 4, op: '×' } })).toEqual({ kind: 'mul', a: 3, b: 4, product: 12 })
    expect(tableFactOf({ ...base, operands: { a: 12, b: 4, op: ':' } })).toEqual({ kind: 'div', dividend: 12, divisor: 4, quotient: 3 })
  })
  it('ignores other items', () => {
    expect(tableFactOf(base)).toBeUndefined()
    expect(tableFactOf({ ...base, operands: { a: 3, b: 4, op: '+' } })).toBeUndefined()
    expect(tableFactOf({ ...base, operands: { a: 7, b: 2, op: ':' } })).toBeUndefined()
    expect(tableFactOf({ ...base, operands: { a: 7, b: 0, op: ':' } })).toBeUndefined()
  })
  it('flags facts with 0 or 1 as trivial', () => {
    expect(isTrivial({ kind: 'mul', a: 0, b: 5, product: 0 })).toBe(true)
    expect(isTrivial({ kind: 'mul', a: 5, b: 1, product: 5 })).toBe(true)
    expect(isTrivial({ kind: 'mul', a: 2, b: 5, product: 10 })).toBe(false)
    expect(isTrivial({ kind: 'div', dividend: 0, divisor: 3, quotient: 0 })).toBe(true)
    expect(isTrivial({ kind: 'div', dividend: 6, divisor: 1, quotient: 6 })).toBe(true)
    expect(isTrivial({ kind: 'div', dividend: 6, divisor: 3, quotient: 2 })).toBe(false)
  })
  it('groups: total always equals groups x size', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), (a, b) => {
        const m = groupsOf({ kind: 'mul', a, b, product: a * b })
        const d = groupsOf({ kind: 'div', dividend: a * b, divisor: b, quotient: a })
        expect(m.groups * m.size).toBe(m.total)
        expect(d.groups * d.size).toBe(d.total)
      }),
    )
  })
  it('maps the stage to a level', () => {
    expect([levelOf('concret'), levelOf('pictoric'), levelOf('abstracte')]).toEqual([1, 2, 3])
  })
  it('lists multiples and sums', () => {
    expect(multiples(3, 4)).toEqual([3, 6, 9, 12])
    expect(multiples(3, 0)).toEqual([])
    expect(repeatedSum(4, 3)).toBe('4 + 4 + 4')
  })
})
