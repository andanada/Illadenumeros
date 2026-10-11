import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { PERRUQUERIA_SKILLS } from '../perruqueriaSkills'
import { headFrames } from './clipLayout'
import { clipCaption, clipPlayOf, SIDE_CAPACITY, wornTotal } from './clipTask'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number]): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base: Item = {
  id: 'x',
  skillId: 'A7',
  text: '4 + 5 = ?',
  speech: '',
  answer: '9',
  choices: [{ value: '9' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage: 'concret',
  operands: { a: 4, b: 5, op: '+' },
}

describe('clipPlayOf', () => {
  it('two groups: nothing is worn, left and right hold the two addends', () => {
    expect(clipPlayOf(base)).toMatchObject({ mode: 'pair', expected: 9, worn: { left: 0, right: 0 }, whole: 9, groups: { left: 4, right: 5 } })
  })

  it('«ja porto 4 i en vull 8»: four are worn, split over the two sides, and four are to add', () => {
    const p = clipPlayOf({ ...base, skillId: 'A10', text: '4 + ? = 8', answer: '4', operands: { a: 4, b: 4, op: '+' } })
    expect(p).toMatchObject({ mode: 'more', expected: 4, whole: 8 })
    expect(p && wornTotal(p)).toBe(4)
    expect(p?.worn).toEqual({ left: 2, right: 2 })
  })

  it('refuses what does not fit a head', () => {
    expect(clipPlayOf({ ...base, operands: { a: 12, b: 5, op: '+' }, text: '12 + 5 = ?', answer: '17' })).toBeUndefined()
  })

  it('every item of every clip skill and CPA stage can be done on the head, and each side has room', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PERRUQUERIA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const play = clipPlayOf(it)
        if (!play) return
        expect(String(play.expected)).toBe(it.answer)
        expect(play.worn.left + play.worn.right + play.expected).toBe(play.whole)
        expect(Math.max(play.worn.left, play.worn.right)).toBeLessThanOrEqual(SIDE_CAPACITY)
        if (play.groups) expect(Math.max(play.groups.left, play.groups.right)).toBeLessThanOrEqual(SIDE_CAPACITY)
      }),
      { numRuns: 400 },
    )
  })

  it('never says the number in the caption', () => {
    const p = clipPlayOf(base)
    if (!p) throw new Error('sense joc')
    expect(clipCaption(p, 0)).not.toMatch(/\d/)
    expect(clipCaption(p, 3)).not.toMatch(/\d/)
  })
})

describe('headFrames', () => {
  it('puts a block on each side of the head, inside the room, on an iPad, a laptop and a phone', () => {
    for (const stage of [
      { w: 1024, h: 600 },
      { w: 1180, h: 680 },
      { w: 390, h: 560 },
    ]) {
      const [left, right] = headFrames({ x: 0.36, y: 0.72 }, stage, 0.46)
      if (!left || !right) throw new Error('sense blocs')
      expect(left.rect.x + left.rect.w).toBeLessThan(0.36)
      expect(right.rect.x).toBeGreaterThan(0.36)
      for (const f of [left, right]) {
        expect(f.rect.x).toBeGreaterThanOrEqual(0)
        expect(f.rect.x + f.rect.w).toBeLessThanOrEqual(1)
        expect(f.rect.y).toBeGreaterThanOrEqual(0)
        expect(f.rect.y + f.rect.h).toBeLessThan(0.72)
      }
    }
  })
})
