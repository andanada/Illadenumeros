import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CPA_STAGES, MISCONCEPTIONS, type CpaStage, type Item } from '../../../core/ambit/types'
import { createRng } from '../../../core/rng'
import { planFromItem } from '../../../games/botiga-pluja/shopLogic'
import { parseDecimal } from './decimals'
import { expectedAnswer } from './expectedAnswer.testutil'
import { evaluate } from './expectedAnswer5e.testutil'
import { MATES_GENERATORS } from './index'

const E_SKILLS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']
const NEW_IDS = MISCONCEPTIONS.slice(MISCONCEPTIONS.indexOf('one-step-only') + 1)

function generate(skillId: string, seed: string, cpaStage: CpaStage): Item {
  const generator = MATES_GENERATORS[skillId]
  if (!generator) throw new Error(skillId)
  return generator({ rng: createRng(`${skillId}:${seed}`), cpaStage })
}

const forItems = (skillId: string, check: (item: Item) => void, numRuns = 200): void => {
  fc.assert(
    fc.property(fc.string(), fc.constantFrom(...CPA_STAGES), (seed, stage) => {
      check(generate(skillId, seed, stage))
    }),
    { numRuns },
  )
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

describe('5è generators', () => {
  it('registers the new misconception ids', () => {
    expect(NEW_IDS).toHaveLength(12)
  })

  it.each(E_SKILLS)('%s: 3-4 distinct choices, one right, in range, with a typical-error distractor', (skillId) => {
    forItems(skillId, (item) => {
      const values = item.choices.map((c) => c.value)
      expect(values, item.text).toHaveLength(/^\S+ \? \S+$/.test(item.text) ? 3 : 4)
      expect(new Set(values).size).toBe(values.length)
      expect(values.filter((v) => v === item.answer)).toHaveLength(1)
      expect(item.answer, item.text).toBe(expectedAnswer(item))
      expect(item.choices.some((c) => c.misconception !== undefined), item.text).toBe(true)
      expect(item.choices.find((c) => c.value === item.answer)?.misconception).toBeUndefined()
      for (const v of values) expect(v, item.text).not.toMatch(/^-|NaN|undefined|Infinity/)
    })
  })

  it.each(E_SKILLS)('%s is deterministic and has three non-empty hints', (skillId) => {
    expect(generate(skillId, 'same', 'pictoric')).toEqual(generate(skillId, 'same', 'pictoric'))
    forItems(
      skillId,
      (item) => {
        expect(item.hints).toHaveLength(3)
        for (const h of [...item.hints, item.text, item.speech]) expect(h.length).toBeGreaterThan(0)
        expect(item.skillId).toBe(skillId)
      },
      40,
    )
  })

  it.each(['E1', 'E2', 'E3', 'E5'])('%s writes decimals with a comma, never a point', (skillId) => {
    forItems(skillId, (item) => {
      for (const t of [item.text, item.answer, ...item.choices.map((c) => c.value), ...item.hints]) expect(t).not.toMatch(/\d\.\d/)
    })
  })

  it('E1 agrees singular and plural', () => {
    forItems('E1', (item) => {
      expect(item.text).not.toMatch(/\b1 (unitats|dècimes|centèsimes)\b/)
      expect(item.text).not.toMatch(/\b([2-9]) (unitat|dècima|centèsima)\b/)
    })
  })

  it('E1 hides the grid only in the abstract stage but keeps it as a hint', () => {
    const abstract = Array.from({ length: 60 }, (_, i) => generate('E1', `g${i}`, 'abstracte'))
    expect(abstract.every((i) => i.visual.kind === 'none')).toBe(true)
    expect(abstract.some((i) => i.hintVisual.kind === 'hundredGrid')).toBe(true)
  })

  it('E2 keeps the number line visible even in the abstract stage', () => {
    const lines = Array.from({ length: 80 }, (_, i) => generate('E2', `l${i}`, 'abstracte')).filter((i) => i.hintVisual.kind === 'decimalLine')
    expect(lines.length).toBeGreaterThan(5)
    for (const i of lines) expect(i.visual.kind).toBe('decimalLine')
  })

  it('E2 flags the "longer decimal is bigger" slip', () => {
    const seen = new Set<string>()
    forItems('E2', (item) => item.choices.forEach((c) => c.misconception && seen.add(c.misconception)))
    expect(seen.has('decimal-longer-bigger')).toBe(true)
  })

  it('E3 never goes negative and flags misaligned commas', () => {
    let misaligned = 0
    forItems('E3', (item) => {
      expect(parseDecimal(item.answer)).toBeGreaterThan(0)
      if (item.choices.some((c) => c.misconception === 'decimal-misaligned')) misaligned++
    })
    expect(misaligned).toBeGreaterThan(10)
  })

  it('E4 is a 2 x 2 product with the steps in the worked hint', () => {
    forItems('E4', (item) => {
      const { a = 0, b = 0 } = item.operands ?? {}
      expect(a).toBeGreaterThanOrEqual(12)
      expect(b).toBeGreaterThanOrEqual(11)
      expect(item.operands?.op).toBe('×')
      expect(item.hints[2]).toContain(String(a * b))
    })
  })

  it('E5 gives exact quotients, with and without decimals', () => {
    let decimal = 0
    forItems('E5', (item) => {
      if (item.answer.includes(',')) decimal++
    })
    expect(decimal).toBeGreaterThan(80)
  })

  it('E6 expressions have whole positive results and a priority trap', () => {
    forItems('E6', (item) => {
      const value = evaluate(item.text.replace(/ = \?$/, ''))
      expect(Number.isInteger(value), item.text).toBe(true)
      expect(value, item.text).toBeGreaterThan(0)
      expect(item.choices.some((c) => c.misconception === 'order-of-operations'), item.text).toBe(true)
    })
  })

  it('E7 squares are drawn as an n x n array playable in the bakery', () => {
    forItems('E7', (item) => {
      if (!item.operands) return
      expect(item.operands.a).toBe(item.operands.b)
      expect(item.hintVisual).toEqual({ kind: 'array', rows: item.operands.a, cols: item.operands.a })
    })
  })

  it('E8 mixes multiples and divisors', () => {
    const kinds = new Set<string>()
    forItems('E8', (item) => kinds.add(/múltiple/.test(item.text) ? 'm' : 'd'))
    expect(kinds.size).toBe(2)
  })

  it('E9 simplified answers are fully reduced', () => {
    forItems('E9', (item) => {
      if (!/^Simplifica/.test(item.text)) return
      const [n, d] = item.answer.split('/').map(Number)
      expect(gcd(n ?? 0, d ?? 1)).toBe(1)
    })
  })

  it('E10 uses 10 %, 25 % and 50 % and Catalan prices', () => {
    const pcts = new Set<string>()
    forItems('E10', (item) => {
      const m = /(\d+) %/.exec(item.text)
      pcts.add(m?.[1] ?? '')
      expect(['10', '25', '50']).toContain(m?.[1])
      if (/€/.test(item.answer)) {
        expect(item.answer).toMatch(/^\d+,\d{2} €$/)
        for (const c of item.choices) expect(c.value).toMatch(/^\d+,\d{2} €$/)
      }
    })
    expect(pcts.size).toBe(3)
  })

  it('E10 change questions play in pay mode in the concrete stage', () => {
    let pay = 0
    forItems('E10', (item) => {
      if (!/canvi/.test(item.text)) return
      expect(item.hintVisual.kind).toBe('money')
      const plan = planFromItem(item)
      if (item.cpaStage !== 'concret') return
      expect(plan.mode).toBe('pay')
      pay++
      if (plan.mode === 'pay') expect(plan.target).toBeLessThanOrEqual(2000)
    })
    expect(pay).toBeGreaterThan(5)
  })

  it.each(['E8', 'E9', 'E10', 'E6'])('%s Catalan has no "1 + plural" and no unelided "de + vowel"', (skillId) => {
    forItems(skillId, (item) => {
      for (const t of [item.text, item.speech, ...item.hints]) {
        expect(t).not.toMatch(/\b(de|la|el) [aeiouàèéíòóúh]/i)
        expect(t).not.toMatch(/(^|\s)1 (euros|metres|litres)\b/)
      }
    })
  })
})
