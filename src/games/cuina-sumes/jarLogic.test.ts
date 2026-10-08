import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseProblem, type Problem } from '../shared/arith/problem'
import { bridgeHint, buildJar, describeJar, filled, jarCapacity, subtractionMode } from './jarLogic'

const p = (text: string): Problem => {
  const r = parseProblem(text)
  if (!r) throw new Error(text)
  return r
}

describe('jarCapacity', () => {
  it('uses 10, 20 and 100', () => {
    expect([5, 10, 11, 20, 21, 90].map(jarCapacity)).toEqual([10, 10, 20, 20, 100, 100])
  })
})

describe('buildJar', () => {
  it('make-ten: 7 + ? = 10 fills the jar of 10', () => {
    const jar = buildJar(p('7 + ? = 10'), 0)
    expect(jar.mode).toBe('make')
    expect(jar.capacity).toBe(10)
    expect(filled(jar)).toBe(10)
    expect(jar.caption).toContain('exactament 10')
  })
  it('tells subtractions as sobra or falta', () => {
    expect(subtractionMode(0)).toBe('sobra')
    expect(subtractionMode(1)).toBe('falta')
    expect(buildJar(p('9 − 4 = ?'), 0).caption).toContain('sobra')
    expect(buildJar(p('9 − 4 = ?'), 1).caption).toContain('falta')
  })
  it('bridges with tens: 40 + 30 in the jar of 100', () => {
    const jar = buildJar(p('40 + 30 = ?'), 0)
    expect(jar.capacity).toBe(100)
    expect(filled(jar)).toBe(70)
  })
  it('never overfills the jar and keeps the hidden amount equal to the answer', () => {
    const texts = fc.oneof(
      fc.tuple(fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 39 })).map(([a, b]) => `${a} + ${b} = ?`),
      fc.tuple(fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 39 })).map(([a, b]) => `${a + b} − ${b} = ?`),
      fc.tuple(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 1, max: 39 })).map(([a, b]) => `${a} + ? = ${a + b}`),
    )
    fc.assert(
      fc.property(texts, fc.nat(), (text, seed) => {
        const problem = p(text)
        const jar = buildJar(problem, seed)
        expect(filled(jar)).toBeLessThanOrEqual(jar.capacity)
        const hidden = jar.segments.find((s) => s.kind === 'hidden')
        if (hidden) expect(hidden.amount).toBe(problem.answer)
      }),
    )
  })
})

describe('bridgeHint', () => {
  it('suggests making ten first', () => {
    expect(bridgeHint(p('8 + 5 = ?'))).toContain('fins a 10 amb 2')
    expect(bridgeHint(p('2 + 3 = ?'))).toBeUndefined()
    expect(bridgeHint(p('9 − 4 = ?'))).toBeUndefined()
  })
  it('describes the jar', () => {
    expect(describeJar(buildJar(p('7 + ? = 10'), 0), null)).toBe('Gerra de 10: 7 i buit.')
  })
})
