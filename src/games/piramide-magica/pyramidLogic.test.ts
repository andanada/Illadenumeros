import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseProblem, type Problem } from '../shared/arith/problem'
import { buildPyramid, describePyramid, hiddenValue, isConsistent, rowsFor } from './pyramidLogic'

const p = (text: string): Problem => {
  const r = parseProblem(text)
  if (!r) throw new Error(text)
  return r
}

describe('buildPyramid', () => {
  it('adds up: 3 and 4 give 7 on top', () => {
    const pyramid = buildPyramid(p('3 + 4 = ?'), 1, 0)
    expect(pyramid[0]?.[0]).toEqual({ value: 7, hidden: true })
    expect(pyramid[1]?.map((c) => c.value)).toEqual([3, 4])
  })
  it('subtracts by finding the missing base: 9 − 4', () => {
    const pyramid = buildPyramid(p('9 − 4 = ?'), 1, 0)
    expect(hiddenValue(pyramid)).toBe(5)
    expect(pyramid[0]?.[0]?.value).toBe(9)
  })
  it('has the rows of the level', () => {
    expect(rowsFor(1)).toBe(2)
    expect(buildPyramid(p('8 + 5 = ?'), 2, 3)).toHaveLength(3)
  })
  it('always has one hidden block that holds the answer and a consistent pyramid', () => {
    const texts = fc.oneof(
      fc.tuple(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 0, max: 50 })).map(([a, b]) => `${a} + ${b} = ?`),
      fc.tuple(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 0, max: 50 })).map(([a, b]) => `${a + b} − ${b} = ?`),
      fc.tuple(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })).map(([a, b]) => `${a} + ? = ${a + b}`),
    )
    fc.assert(
      fc.property(texts, fc.constantFrom(1 as const, 2 as const, 3 as const), fc.nat(), (text, level, seed) => {
        const problem = p(text)
        const pyramid = buildPyramid(problem, level, seed)
        expect(isConsistent(pyramid)).toBe(true)
        expect(pyramid.flat().filter((c) => c.hidden)).toHaveLength(1)
        expect(hiddenValue(pyramid)).toBe(problem.answer)
      }),
    )
  })
  it('detects a broken pyramid', () => {
    expect(isConsistent([[{ value: 8, hidden: false }], [{ value: 3, hidden: false }, { value: 4, hidden: false }]])).toBe(false)
  })
})

describe('describePyramid', () => {
  it('names the hidden block as empty until a guess is shown', () => {
    const pyramid = buildPyramid(p('3 + 4 = ?'), 1, 0)
    expect(describePyramid(pyramid, null)).toContain('punta: buit')
    expect(describePyramid(pyramid, 7)).toContain('punta: 7')
  })
})
