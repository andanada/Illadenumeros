import { describe, expect, it } from 'vitest'
import { factsForSkill } from './facts'
import { addKey, divKey, mulKey, parseFactKey, subKey } from './generators/itemFactory'
import { factOwner, OPERATIONS } from './operations'
import { MATES_SKILLS } from './skills'

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const FACT_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4']

describe('fact coverage audit: every basic fact is tracked and owned by one skill', () => {
  it('every sum a + b with a, b in 1..10 (both orders) has exactly one owner', () => {
    const missing = range(1, 10).flatMap((a) => range(1, 10).map((b) => addKey(a, b))).filter((k) => factOwner(k) === undefined)
    expect(missing).toEqual([])
  })

  it('every subtraction inverse to those sums (minuend up to 20, result 1..10, subtrahend 1..10) has an owner', () => {
    const keys = range(1, 10).flatMap((x) => range(1, 10).map((r) => subKey(x + r, x)))
    expect(keys).toHaveLength(100)
    expect(keys.filter((k) => factOwner(k) === undefined)).toEqual([])
  })

  it('every product a × b with a, b in 0..10 (including ×0 and ×1) has an owner', () => {
    const missing = range(0, 10).flatMap((a) => range(0, 10).map((b) => mulKey(a, b))).filter((k) => factOwner(k) === undefined)
    expect(missing).toEqual([])
  })

  it('every exact division inverse to the tables (divisor 1..10, quotient 0..10) has an owner', () => {
    const missing = range(1, 10).flatMap((d) => range(0, 10).map((q) => divKey(d * q, d))).filter((k) => factOwner(k) === undefined)
    expect(missing).toEqual([])
  })

  it('every fact key of every skill is unique across skills and has a valid shape', () => {
    const seen = new Set<string>()
    for (const skill of FACT_SKILLS) {
      for (const key of factsForSkill(skill)) {
        expect(key).toMatch(/^(add|sub|mul|div):\d+[+\-x:]\d+$|^c10:\d+$/)
        expect(seen.has(key), key).toBe(false)
        seen.add(key)
      }
    }
  })

  it('never contains a division by zero or an inexact division', () => {
    for (const skill of ['C7', 'D4']) {
      for (const key of factsForSkill(skill)) {
        const [, dividend, divisor] = key.split(':').map(Number) as [number, number, number]
        expect(divisor).toBeGreaterThan(0)
        expect(dividend % divisor).toBe(0)
      }
    }
  })
})

describe('generators can ask every tracked fact with the right answer', () => {
  const evaluate = (key: string): number => {
    const fact = parseFactKey(key)
    if (!fact) throw new Error(key)
    if (fact.kind === 'add') return fact.a + fact.b
    if (fact.kind === 'sub') return fact.a - fact.b
    if (fact.kind === 'mul') return fact.a * fact.b
    return fact.a / fact.b
  }

  it('asks the requested fact and its answer matches', async () => {
    const { MATES_GENERATORS } = await import('./generators')
    const { createRng } = await import('../../core/rng')
    for (const skill of FACT_SKILLS.filter((s) => s !== 'A5')) {
      for (const key of factsForSkill(skill)) {
        const item = MATES_GENERATORS[skill]?.({ rng: createRng(key), cpaStage: 'concret', factKey: key })
        expect(item?.factKey, key).toBe(key)
        expect(item?.answer, key).toBe(String(evaluate(key)))
        expect(item?.choices.map((c) => c.value), key).toContain(item?.answer)
        expect(new Set(item?.choices.map((c) => c.value)).size, key).toBe(item?.choices.length)
      }
    }
  })
})

describe('operations map', () => {
  it('SkillNode.operation agrees with the operations table and only fact skills have one', () => {
    for (const op of OPERATIONS) for (const id of op.skillIds) expect(MATES_SKILLS.find((s) => s.id === id)?.operation, id).toBe(op.id)
    const tagged = MATES_SKILLS.filter((s) => s.operation !== undefined).map((s) => s.id)
    expect(tagged.sort()).toEqual(OPERATIONS.flatMap((o) => o.skillIds).sort())
    for (const s of MATES_SKILLS.filter((x) => x.operation)) expect(s.hasFacts, s.id).toBe(true)
  })
})

describe('commutative order', () => {
  it('asks the requested order for a + b and a x b, and both orders when none is requested', async () => {
    const { MATES_GENERATORS } = await import('./generators')
    const { createRng } = await import('../../core/rng')
    const ask = (skill: string, factKey: string, order?: 'asc' | 'desc', seed = 'o') =>
      MATES_GENERATORS[skill]?.({ rng: createRng(seed), cpaStage: 'abstracte', factKey, ...(order ? { order } : {}) })?.operands
    for (let i = 0; i < 10; i++) {
      expect(ask('A8', 'add:5+8', 'asc', `s${i}`)).toMatchObject({ a: 5, b: 8 })
      expect(ask('A8', 'add:5+8', 'desc', `s${i}`)).toMatchObject({ a: 8, b: 5 })
      expect(ask('D3', 'mul:7x8', 'desc', `s${i}`)).toMatchObject({ a: 8, b: 7 })
    }
    const seen = new Set(Array.from({ length: 30 }, (_, i) => ask('D3', 'mul:7x8', undefined, `r${i}`)?.a))
    expect(seen).toEqual(new Set([7, 8]))
  })
})
