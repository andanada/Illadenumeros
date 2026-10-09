import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { MATES_SKILLS } from '../../../../ambits/mates/skills'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { pickAdapter } from '../../../errands/adapters'
import { CASA_SKILLS } from '../casaSkills'
import { bowlAdapter, CASA_ADAPTERS } from './casaAdapters'
import { ingredientFor, INGREDIENTS, withArticle } from './ingredients'
import { addOne, BOWL_MAX, bowlFromItem, bowlRequest, bowlSolution, bowlValue, takeOne } from './kitchenLogic'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base: Item = { id: 'x', skillId: 'A8', text: '7 + 5 = ?', speech: '', answer: '12', choices: [{ value: '12' }, { value: '11' }, { value: '13' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 7, b: 5, op: '+' } }

describe('casa skills', () => {
  it('are the A-series facts around ten, all real addition / decomposition skills', () => {
    for (const id of CASA_SKILLS) {
      const skill = MATES_SKILLS.find((s) => s.id === id)
      expect(skill, id).toBeDefined()
      expect(skill?.operation === 'add' || id === 'A3', id).toBe(true)
    }
    expect(CASA_SKILLS).not.toContain('A6')
  })

  it('every item of every casa skill, in every CPA stage, is playable in the bowl', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CASA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const adapter = pickAdapter(CASA_ADAPTERS, it)
        if (!adapter) {
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        expect(adapter.build(it).request.text.length).toBeGreaterThan(0)
        const task = bowlFromItem(it)
        if (!task) throw new Error('adaptat sense tasca')
        expect(String(bowlValue(task, bowlSolution(task)))).toBe(it.answer)
        expect(bowlSolution(task)).toBeLessThanOrEqual(BOWL_MAX)
      }),
      { numRuns: 400 },
    )
  })

  it('in fact every casa skill is adapted (none falls back) for many seeds and all stages', () => {
    for (const skillId of CASA_SKILLS) for (const stage of CPA_STAGES) for (let s = 0; s < 30; s++) expect(bowlFromItem(item(skillId, `s${s}`, stage)), `${skillId} ${stage} ${s}`).toBeDefined()
  })
})

describe('bowl logic', () => {
  it('sum: a + b = ? starts empty and the answer is the count', () => {
    const t = bowlFromItem(base)
    expect(t).toMatchObject({ mode: 'sum', a: 7, b: 5, start: 0 })
    expect(t && bowlValue(t, 12)).toBe(12)
    expect(t && bowlRequest(t).text).toMatch(/7 \+ 5 .*Omple primer la desena!/)
  })

  it('fill: friends of ten and splitting', () => {
    const friend = bowlFromItem({ ...base, skillId: 'A5', text: '6 + ? = 10', answer: '4', operands: { a: 6, b: 4, op: '+' } })
    expect(friend).toMatchObject({ mode: 'fill', a: 6, b: 4, start: 6 })
    expect(friend && bowlValue(friend, 10)).toBe(4)
    const split = bowlFromItem({ ...base, skillId: 'A3', text: '8 = 3 + ?', answer: '5', operands: undefined })
    expect(split).toMatchObject({ mode: 'fill', a: 3, b: 5, start: 3 })
    expect(split && bowlRequest(split).text).toMatch(/calen 8 .*ja n’hi ha 3: 3 \+ \? = 8/)
  })

  it('doubles and near doubles get their own words', () => {
    const d = bowlFromItem({ ...base, skillId: 'A7', text: '4 + 4 = ?', answer: '8', operands: { a: 4, b: 4, op: '+' } })
    expect(d && bowlRequest(d).text).toMatch(/És un doble!/)
    const n = bowlFromItem({ ...base, skillId: 'A7', text: '4 + 5 = ?', answer: '9', operands: { a: 4, b: 5, op: '+' } })
    expect(n && bowlRequest(n).speech).toMatch(/Gairebé un doble!/)
  })

  it('refuses what does not fit a bowl', () => {
    expect(bowlFromItem({ ...base, operands: { a: 15, b: 9, op: '+' }, answer: '24', text: '15 + 9 = ?' })).toBeUndefined()
    expect(bowlFromItem({ ...base, operands: { a: 3, b: 4, op: '×' } })).toBeUndefined()
    expect(bowlFromItem({ ...base, answer: '3,5' })).toBeUndefined()
    expect(bowlFromItem({ ...base, text: '30 = 3 + ?', answer: '27', operands: undefined })).toBeUndefined()
    expect(() => bowlAdapter.toTask({ ...base, operands: undefined })).toThrow()
  })

  it('counts stay inside the bowl and never under what was already there', () => {
    const t = bowlFromItem({ ...base, skillId: 'A5', text: '6 + ? = 10', answer: '4' })
    if (!t) throw new Error('sense tasca')
    expect(addOne(BOWL_MAX)).toBe(BOWL_MAX)
    expect(takeOne(t, 6)).toBe(6)
    expect(takeOne(t, 8)).toBe(7)
  })

  it('ingredients are stable per item and named with their article', () => {
    expect(ingredientFor('abc')).toEqual(ingredientFor('abc'))
    expect(INGREDIENTS.map(withArticle)).toEqual(['la maduixa', 'el nabiu', 'la galeta', 'l’ou'])
  })
})
