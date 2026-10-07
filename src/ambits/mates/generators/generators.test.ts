import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CPA_STAGES, type CpaStage, type Item } from '../../../core/ambit/types'
import { createRng } from '../../../core/rng'
import { factsForSkill } from '../facts'
import { MATES_SKILLS } from '../skills'
import { expectedAnswer } from './expectedAnswer.testutil'
import { MATES_GENERATORS } from './index'
import { parseFactKey } from './itemFactory'

const NEW_SKILLS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9']
const FACT_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4']
const MONEY = /^\d+,\d{2} €$/

function generate(skillId: string, seed: string, cpaStage: CpaStage, factKey?: string): Item {
  const generator = MATES_GENERATORS[skillId]
  if (!generator) throw new Error(skillId)
  return generator({ rng: createRng(`${skillId}:${seed}`), cpaStage, ...(factKey !== undefined ? { factKey } : {}) })
}

const forItems = (skillId: string, check: (item: Item) => void, numRuns = 150): void => {
  fc.assert(
    fc.property(fc.string(), fc.constantFrom(...CPA_STAGES), (seed, cpaStage) => {
      check(generate(skillId, seed, cpaStage))
    }),
    { numRuns },
  )
}

describe('maths generators', () => {
  it('every skill has a generator and every fact skill has facts', () => {
    for (const skill of MATES_SKILLS) {
      expect(MATES_GENERATORS[skill.id], skill.id).toBeTypeOf('function')
      if (skill.hasFacts) expect(factsForSkill(skill.id).length, skill.id).toBeGreaterThan(0)
    }
  })

  it.each(MATES_SKILLS.map((s) => s.id))('%s: answer is right, unique, with distinct non-negative choices', (skillId) => {
    forItems(skillId, (item) => {
      const values = item.choices.map((c) => c.value)
      expect(new Set(values).size).toBe(values.length)
      expect(values.filter((v) => v === item.answer)).toHaveLength(1)
      expect(values.length).toBeGreaterThanOrEqual(3)
      expect(item.answer, item.text).toBe(expectedAnswer(item))
      for (const value of values) {
        if (/^-?\d+$/.test(value)) expect(Number(value)).toBeGreaterThanOrEqual(0)
        expect(value).not.toMatch(/^-/)
      }
      expect(item.hints).toHaveLength(3)
      for (const hint of item.hints) expect(hint.length).toBeGreaterThan(0)
      expect(item.skillId).toBe(skillId)
    })
  })

  it('hides the support visual only in the abstract stage', () => {
    expect(generate('A4', 'x', 'abstracte').visual.kind).toBe('none')
    expect(generate('A4', 'x', 'concret').visual.kind).toBe('tenFrame')
  })

  it.each(FACT_SKILLS)('%s honours the requested fact key', (skillId) => {
    for (const factKey of factsForSkill(skillId)) {
      const item = generate(skillId, factKey, 'abstracte', factKey)
      expect(item.factKey).toBe(factKey)
    }
  })

  it.each(['C4', 'C5', 'C7', 'D2', 'D3', 'D4'])('%s always reports a fact key of its own set', (skillId) => {
    forItems(skillId, (item) => expect(factsForSkill(skillId)).toContain(item.factKey), 60)
  })

  it.each(['B7', ...NEW_SKILLS])('%s is deterministic for the same seed', (skillId) => {
    expect(generate(skillId, 'same', 'pictoric')).toEqual(generate(skillId, 'same', 'pictoric'))
  })
})

describe('3r and 4t items', () => {
  it.each(NEW_SKILLS)('%s offers at least one typical-error distractor', (skillId) => {
    forItems(skillId, (item) => expect(item.choices.some((c) => c.misconception !== undefined), item.text).toBe(true), 60)
  })

  it.each(['C3', 'C4', 'C5', 'D2', 'D3', 'D5'])('%s is a multiplication with × operands and an array support', (skillId) => {
    forItems(skillId, (item) => {
      expect(item.operands?.op).toBe('×')
      expect(item.hintVisual.kind).toBe('array')
      if (item.cpaStage === 'abstracte') expect(item.visual.kind).toBe('none')
    }, 60)
  })

  it.each(['C4', 'C5', 'C7', 'D2', 'D3', 'D4'])('%s fact keys match the operands', (skillId) => {
    forItems(skillId, (item) => {
      const fact = parseFactKey(item.factKey ?? '')
      const { a = 0, b = 0 } = item.operands ?? {}
      if (fact?.kind === 'mul') expect([Math.min(a, b), Math.max(a, b)]).toEqual([fact.a, fact.b])
      else expect([a, b]).toEqual([fact?.a, fact?.b])
    }, 60)
  })

  it.each(['C6', 'C7', 'D4', 'D6'])('%s divides with a share support and never by zero', (skillId) => {
    forItems(skillId, (item) => {
      expect(item.operands?.op).toBe(':')
      const { a = 0, b = 0 } = item.operands ?? {}
      expect(b).toBeGreaterThan(0)
      if (skillId !== 'D6') expect(a % b).toBe(0)
      // Sharing shows b plates; grouping (C6 "caixes de b") shows a : b groups of b.
      const v = item.hintVisual
      expect(v.kind).toBe('share')
      if (v.kind === 'share') {
        expect(v.total).toBe(a)
        expect(skillId === 'C6' ? [b, a / b] : [b]).toContain(v.groups)
      }
    }, 60)
  })

  it('D6 asks the quotient or the remainder explicitly, and some divisions have a remainder', () => {
    let withRemainder = 0
    forItems('D6', (item) => {
      expect(/quocient/.test(item.text) !== /residu/.test(item.text), item.text).toBe(true)
      const { a = 0, b = 1 } = item.operands ?? {}
      if (a % b > 0) withRemainder++
      expect(Math.floor(a / b)).toBeGreaterThanOrEqual(1)
    }, 100)
    expect(withRemainder).toBeGreaterThan(50)
  })

  it.each(['C8', 'D7'])('%s fractions of a collection always give whole results', (skillId) => {
    forItems(skillId, (item) => {
      const v = item.hintVisual
      expect(v.kind).toBe('fraction')
      if (v.kind !== 'fraction') return
      expect([2, 3, 4]).toContain(v.parts)
      expect(v.selected).toBeGreaterThanOrEqual(1)
      expect(v.selected).toBeLessThan(v.parts)
      if (v.collection !== undefined) expect(v.collection % v.parts).toBe(0)
    })
  })

  it('D7 includes ¾ of a collection', () => {
    const seeds = Array.from({ length: 80 }, (_, i) => generate('D7', `t${i}`, 'pictoric').hintVisual)
    expect(seeds.some((v) => v.kind === 'fraction' && v.parts === 4 && v.selected === 3 && v.collection !== undefined)).toBe(true)
  })

  it('C9 money is in a sensible range and formatted in Catalan', () => {
    forItems('C9', (item) => {
      expect(item.answer).toMatch(MONEY)
      for (const c of item.choices) expect(c.value).toMatch(MONEY)
      const v = item.hintVisual
      expect(v.kind).toBe('money')
      if (v.kind === 'money') for (const coin of v.coins) expect([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]).toContain(coin)
      const cents = Number(item.answer.replace(/[ €]/g, '').replace(',', ''))
      expect(cents).toBeGreaterThan(0)
      expect(cents).toBeLessThanOrEqual(2000)
    })
  })

  it.each(['C1', 'D1'])('%s numbers stay inside the grade range', (skillId) => {
    const max = skillId === 'C1' ? 1000 : 9999
    forItems(skillId, (item) => {
      expect(Number(item.answer)).toBeLessThanOrEqual(max)
      for (const c of item.choices) expect(Number(c.value)).toBeLessThanOrEqual(max + 1000)
    })
  })

  it.each(['C10', 'D9'])('%s writes Catalan with elision (d’, l’) and no "1 + plural"', (skillId) => {
    forItems(skillId, (item) => {
      for (const text of [item.text, item.speech, ...item.hints]) {
        expect(text, text).not.toMatch(/\b(de|la|el) [aeiouàèéíòóúh]/i)
        expect(text, text).not.toMatch(/(^|\s)1 (magdalenes|llaminadures|adhesius|caramels|galetes|pomes|cromos|bosses|caixes|amics|amigues)\b/)
      }
    })
  })

  it('C10 problems need two different steps', () => {
    forItems('C10', (item) => {
      const ops = [...item.hints[2].matchAll(/\d+ ([+−×:]) \d+ =/g)].map((m) => m[1])
      expect(ops).toHaveLength(2)
    })
  })
})
