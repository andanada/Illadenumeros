import { describe, expect, it } from 'vitest'
import { factsForSkill } from './facts'
import { divKey, mulKey, parseFactKey } from './generators/itemFactory'

const FACT_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4']
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)

describe('fact sets avoid trivial or zero facts', () => {
  it('A4 additions never use a zero addend', () => {
    for (const key of factsForSkill('A4')) expect(key).not.toMatch(/\+0$|:0\+/)
  })

  it('A6 subtractions never subtract 0 or the number itself', () => {
    for (const key of factsForSkill('A6')) {
      const match = /^sub:(\d+)-(\d+)$/.exec(key)
      expect(match, key).not.toBeNull()
      const [a, b] = [Number(match?.[1]), Number(match?.[2])]
      expect(b).toBeGreaterThan(0)
      expect(b).toBeLessThan(a)
    }
  })
})

describe('fact sets do not overlap between skills', () => {
  it('no fact key belongs to two skills', () => {
    const seen = new Map<string, string>()
    for (const skill of FACT_SKILLS) {
      for (const key of factsForSkill(skill)) {
        expect(seen.get(key), `${key} en ${skill} y ${seen.get(key)}`).toBeUndefined()
        seen.set(key, skill)
      }
    }
  })
})

describe('multiplication and division fact keys', () => {
  it('mulKey puts the smaller factor first and divKey keeps dividend:divisor', () => {
    expect(mulKey(7, 3)).toBe('mul:3x7')
    expect(mulKey(3, 7)).toBe('mul:3x7')
    expect(divKey(21, 3)).toBe('div:21:3')
  })

  it('parseFactKey understands mul and div keys', () => {
    expect(parseFactKey('mul:3x7')).toEqual({ kind: 'mul', a: 3, b: 7 })
    expect(parseFactKey('div:21:3')).toEqual({ kind: 'div', a: 21, b: 3 })
    expect(parseFactKey('add:2+3')).toEqual({ kind: 'add', a: 2, b: 3 })
    expect(parseFactKey('c10:3')).toEqual({ kind: 'c10', a: 3, b: 7 })
    expect(parseFactKey('mul:3+7')).toBeUndefined()
    expect(parseFactKey('div:21x3')).toBeUndefined()
  })

  it('C4 is the full 2×, 5× and 10× tables (1..10), commutative pairs counted once', () => {
    const expected = new Set([2, 5, 10].flatMap((a) => range(1, 10).map((b) => mulKey(a, b))))
    expect(new Set(factsForSkill('C4'))).toEqual(expected)
    expect(factsForSkill('C4')).toHaveLength(27)
  })

  it('C5, D2 and D3 contain only their own tables and leave out earlier ones', () => {
    const tableOf = (key: string): number[] => {
      const fact = parseFactKey(key)
      return fact ? [fact.a, fact.b] : []
    }
    const cases: [string, number[]][] = [['C5', [3, 4]], ['D2', [6, 9]], ['D3', [7, 8]]]
    for (const [skill, tables] of cases) {
      for (const key of factsForSkill(skill)) expect(tableOf(key).some((n) => tables.includes(n)), key).toBe(true)
    }
    expect(factsForSkill('C5')).not.toContain('mul:3x5')
    expect(factsForSkill('C5')).not.toContain('mul:4x10')
    expect(factsForSkill('D2')).toContain('mul:6x7')
    expect(factsForSkill('D2')).toContain('mul:8x9')
    expect(factsForSkill('D3')).toContain('mul:7x8')
    expect(factsForSkill('D3')).not.toContain('mul:6x7')
  })

  it('together the tables cover every product from 1×1 to 10×10 except ×1 of 1', () => {
    const all = new Set(['C4', 'C5', 'D2', 'D3'].flatMap(factsForSkill))
    for (const a of range(2, 10)) for (const b of range(1, 10)) expect(all.has(mulKey(a, b)), mulKey(a, b)).toBe(true)
  })

  it('C7 are the exact inverse facts of the 2, 5 and 10 tables', () => {
    const expected = [2, 5, 10].flatMap((d) => range(1, 10).map((q) => divKey(d * q, d)))
    expect(new Set(factsForSkill('C7'))).toEqual(new Set(expected))
  })

  it('D4 holds the remaining exact divisions by 3, 4, 6, 7, 8 and 9', () => {
    expect(factsForSkill('D4')).toHaveLength(60)
    for (const key of factsForSkill('D4')) {
      const fact = parseFactKey(key)
      expect(fact?.kind).toBe('div')
      expect([3, 4, 6, 7, 8, 9]).toContain(fact?.b)
      expect((fact?.a ?? 1) % (fact?.b ?? 1)).toBe(0)
    }
  })
})
