import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { CASA_SKILLS } from '../casaSkills'
import { INGREDIENTS } from '../kitchen/ingredients'
import { frameLayout, otherSide, pileAreaOf, sideOf } from './homeLayout'
import { homeTaskOf, looseDef, PLACES, preDef } from './homeTask'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number]): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base: Item = { id: 'x', skillId: 'A8', text: '7 + 5 = ?', speech: '', answer: '12', choices: [{ value: '12' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 7, b: 5, op: '+' } }

describe('homeTaskOf', () => {
  it('a sum is carried whole into an empty frame (two frames when it goes past ten)', () => {
    expect(homeTaskOf(base, 'maduixa')).toMatchObject({ mode: 'sum', pre: 0, expected: 12, whole: 12, capacity: 20 })
    expect(homeTaskOf({ ...base, text: '3 + 4 = ?', answer: '7', operands: { a: 3, b: 4, op: '+' } }, 'galeta')).toMatchObject({ expected: 7, capacity: 10 })
  })

  it('«ja n’hi ha 6, calen 10»: six are already there and she adds the four that are missing', () => {
    const t = homeTaskOf({ ...base, skillId: 'A5', text: '6 + ? = 10', answer: '4', operands: { a: 6, b: 4, op: '+' } }, 'tovallola')
    expect(t).toMatchObject({ mode: 'fill', pre: 6, expected: 4, whole: 10, capacity: 10 })
    expect(t?.ingredient.id).toBe('tovallola')
  })

  it('refuses what does not fit the frames', () => {
    expect(homeTaskOf({ ...base, text: '15 + 9 = ?', answer: '24', operands: { a: 15, b: 9, op: '+' } })).toBeUndefined()
  })

  it('every item of every casa skill and CPA stage can be done in the world, and the frame always has room', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CASA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const t = homeTaskOf(it)
        expect(t, `${skillId} ${stage} ${seed}`).toBeDefined()
        if (!t) return
        expect(String(t.expected)).toBe(it.answer)
        expect(t.whole).toBeLessThanOrEqual(t.capacity)
        expect(t.pre + t.expected).toBe(t.whole)
      }),
      { numRuns: 400 },
    )
  })

  it('each ingredient has its own def for what she carries and for what was already there, and a place', () => {
    for (const i of INGREDIENTS) expect(looseDef(i)).not.toBe(preDef(i))
    expect(PLACES.maduixa.frame).toBe('el bol')
    expect(PLACES.tovallola.frame).toBe('el penja-tovalloles')
    expect(PLACES.croqueta.frame).toBe('el bol de la mascota')
  })
})

describe('home layout', () => {
  it('the frame sits on the asker’s half and the pile on the other', () => {
    expect(sideOf(0.72)).toBe('right')
    expect(sideOf(0.28)).toBe('left')
    const right = frameLayout(10, 'right', { w: 1024, h: 207 })
    expect(right.rect.x).toBeGreaterThanOrEqual(0.5)
    expect(right.rect.x + right.rect.w).toBeLessThanOrEqual(0.9)
    expect(pileAreaOf('right').x1).toBeLessThanOrEqual(0.5)
    expect(otherSide('left')).toBe('right')
  })

  it('fits the floor on an iPad, a laptop and a phone, with room for every slot', () => {
    for (const stage of [{ w: 1024, h: 207 }, { w: 1180, h: 220 }, { w: 390, h: 312 }]) {
      for (const cap of [10, 20] as const) {
        const f = frameLayout(cap, 'left', stage)
        expect(f.rect.y).toBeGreaterThanOrEqual(0.5)
        expect(f.rect.y + f.rect.h).toBeLessThanOrEqual(0.9701)
        expect(f.cols * Math.ceil(cap / f.cols)).toBeGreaterThanOrEqual(cap)
        expect((f.rect.w * stage.w) / f.cols).toBeGreaterThanOrEqual(26)
      }
    }
  })
})
