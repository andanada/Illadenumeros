import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { hashText, levelOf, parseProblem, splitValue } from './problem'

describe('parseProblem', () => {
  it('reads sums, differences and missing addends', () => {
    expect(parseProblem('3 + 4 = ?')).toEqual({ kind: 'sum', a: 3, b: 4, answer: 7, top: 7 })
    expect(parseProblem('9 − 5 = ?')).toEqual({ kind: 'diff', a: 9, b: 5, answer: 4, top: 9 })
    expect(parseProblem('7 + ? = 10')).toEqual({ kind: 'missing', a: 7, b: 3, answer: 3, top: 10 })
    expect(parseProblem('? + 7 = 10')?.answer).toBe(3)
  })
  it('rejects anything else', () => {
    expect(parseProblem('4 × 3 = ?')).toBeUndefined()
    expect(parseProblem('3 − 9 = ?')).toBeUndefined()
    expect(parseProblem('Quants n’hi ha?')).toBeUndefined()
  })
  it('round-trips any sum or difference', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 99 }), (a, b) => {
        expect(parseProblem(`${a} + ${b} = ?`)?.answer).toBe(a + b)
        const [big, small] = [Math.max(a, b), Math.min(a, b)]
        expect(parseProblem(`${big} − ${small} = ?`)?.answer).toBe(big - small)
      }),
    )
  })
})

describe('levelOf', () => {
  it('grows with the size of the numbers', () => {
    expect(levelOf({ kind: 'sum', a: 4, b: 5, answer: 9, top: 9 })).toBe(1)
    expect(levelOf({ kind: 'sum', a: 8, b: 5, answer: 13, top: 13 })).toBe(2)
    expect(levelOf({ kind: 'sum', a: 40, b: 30, answer: 70, top: 70 })).toBe(3)
  })
})

describe('splitValue / hashText', () => {
  it('splits into parts that add up', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), fc.nat(), (value, seed) => {
        const [x, y] = splitValue(value, seed)
        expect(x + y).toBe(value)
        if (value >= 2) expect(Math.min(x, y)).toBeGreaterThanOrEqual(1)
      }),
    )
  })
  it('is stable', () => {
    expect(hashText('abc')).toBe(hashText('abc'))
    expect(hashText('abc')).not.toBe(hashText('abd'))
  })
})
