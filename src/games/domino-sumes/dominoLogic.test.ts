import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseProblem, type Problem } from '../shared/arith/problem'
import { buildChain, describeChain, fits, halfValue, openValue, touches, trayPips } from './dominoLogic'

const problem = (text: string): Problem => {
  const p = parseProblem(text)
  if (!p) throw new Error(text)
  return p
}

describe('touches', () => {
  it('accepts equal values: 3 + 4 next to 7', () => {
    expect(touches({ kind: 'expr', text: '3 + 4', value: 7 }, { kind: 'num', n: 7 })).toBe(true)
    expect(touches({ kind: 'expr', text: '3 + 4', value: 7 }, { kind: 'num', n: 6 })).toBe(false)
  })
  it('never matches decoration pips', () => {
    expect(touches({ kind: 'pips', n: 3 }, { kind: 'num', n: 3 })).toBe(false)
    expect(halfValue({ kind: 'pips', n: 3 })).toBeUndefined()
  })
})

describe('buildChain', () => {
  it('accepts only the answer at the open end (sum)', () => {
    const chain = buildChain(problem('3 + 4 = ?'), 1, 5)
    expect(chain.fixed).toHaveLength(1)
    expect(fits(chain.open, 7)).toBe(true)
    expect(fits(chain.open, 6)).toBe(false)
  })
  it('completes a domino to a target (missing addend)', () => {
    const chain = buildChain(problem('7 + ? = 10'), 1, 2)
    expect(chain.open.mode).toBe('addend')
    expect(openValue(chain.open, 3)).toBe(10)
    expect(fits(chain.open, 3)).toBe(true)
    expect(fits(chain.open, 4)).toBe(false)
  })
  it('keeps every fixed touching pair consistent and the open end solvable', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 40 }), fc.constantFrom(1 as const, 2 as const, 3 as const), fc.nat(), (a, b, level, seed) => {
        const p = problem(`${a} + ${b} = ?`)
        const chain = buildChain(p, level, seed)
        expect(chain.fixed).toHaveLength(level)
        for (let i = 1; i < chain.fixed.length; i++) {
          const [prev, cur] = [chain.fixed[i - 1], chain.fixed[i]]
          if (prev && cur) expect(touches(prev.right, cur.left)).toBe(true)
        }
        expect(fits(chain.open, p.answer)).toBe(true)
      }),
    )
  })
})

describe('helpers', () => {
  it('pips stay between 1 and 6', () => {
    fc.assert(fc.property(fc.nat(500), (v) => trayPips(v) >= 1 && trayPips(v) <= 6))
  })
  it('describes the chain for screen readers', () => {
    const text = describeChain(buildChain(problem('3 + 4 = ?'), 1, 1), null)
    expect(text).toContain('3 + 4')
    expect(text).toContain('buit')
  })
})
