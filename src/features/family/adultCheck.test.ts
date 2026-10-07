import { describe, expect, it } from 'vitest'
import { createAdultCheck, isAdultAnswer } from './adultCheck'

describe('createAdultCheck', () => {
  it('is deterministic for a given seed', () => {
    expect(createAdultCheck('abc')).toEqual(createAdultCheck('abc'))
  })

  it('different seeds give different checks', () => {
    const prompts = new Set(Array.from({ length: 30 }, (_, i) => createAdultCheck(`s${i}`).prompt))
    expect(prompts.size).toBeGreaterThan(5)
  })

  it('always has a correct answer: a two-digit times a one-digit number, beyond the times tables', () => {
    for (let i = 0; i < 200; i++) {
      const check = createAdultCheck(`seed-${i}`)
      expect(check.answer).toBe(check.a * check.b)
      expect(check.a).toBeGreaterThanOrEqual(12)
      expect(check.a).toBeLessThanOrEqual(19)
      expect(check.b).toBeGreaterThanOrEqual(6)
      expect(check.b).toBeLessThanOrEqual(9)
      expect(check.prompt).toBe(`${check.a} × ${check.b}`)
    }
  })
})

describe('isAdultAnswer', () => {
  const check = createAdultCheck('fix')

  it('accepts the right number, with spaces around', () => {
    expect(isAdultAnswer(check, ` ${check.answer} `)).toBe(true)
  })

  it.each(['', 'abc', '12.5', '-3', '1e2', String(Number.MAX_SAFE_INTEGER) + '9'])('rejects invalid input %j', (value) => {
    expect(isAdultAnswer(check, value)).toBe(false)
  })

  it('rejects a wrong number', () => {
    expect(isAdultAnswer(check, String(check.answer + 1))).toBe(false)
  })
})
