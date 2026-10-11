import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { pickAdapter } from '../../../errands/adapters'
import { solutionMoves } from '../../shared/doing/pileTask'
import { RECREATIUS_SKILLS } from '../recreatiusSkills'
import { prizeFromItem, prizeRequest, solutionPrizes } from './prizeLogic'
import { RECREATIUS_ADAPTERS } from './prizeMode'
import { prizeLayout, prizeSpec, prizeZones, trayCols } from './prizeSpec'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number]): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base = { id: 'x', skillId: 'A4', text: '7 + 5 = ?', speech: '', answer: '12', choices: [{ value: '12' }, { value: '11' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 7, b: 5, op: '+' } } as unknown as Item

describe('prize tasks', () => {
  it('reads sum, missing, take and times; refuses divisions and big numbers', () => {
    expect(prizeFromItem(base)).toMatchObject({ mode: 'sum', a: 7, b: 5, start: 0 })
    expect(prizeFromItem({ ...base, text: '6 + ? = 10', answer: '4', operands: { a: 6, b: 4, op: '+' } })).toMatchObject({ mode: 'missing', start: 6 })
    expect(prizeFromItem({ ...base, text: '10 = 8 + ?', answer: '2', operands: undefined })).toMatchObject({ mode: 'missing', a: 8, b: 2 })
    expect(prizeFromItem({ ...base, text: '12 − 5 = ?', answer: '7', operands: { a: 12, b: 5, op: '-' } })).toMatchObject({ mode: 'take', start: 12 })
    expect(prizeFromItem({ ...base, text: '3 × 4 = ?', answer: '12', operands: { a: 3, b: 4, op: '×' } })).toMatchObject({ mode: 'times' })
    expect(prizeFromItem({ ...base, text: '8 × 8 = ?', answer: '64', operands: { a: 8, b: 8, op: '×' } })).toBeUndefined()
    expect(prizeFromItem({ ...base, text: '12 : 3 = ?', answer: '4', operands: { a: 12, b: 3, op: ':' } })).toBeUndefined()
  })

  it('the clerk speaks with the sum, never the answer, in Catalan', () => {
    const t = prizeFromItem(base)
    if (!t) throw new Error('sense tasca')
    expect(prizeRequest(t).text).toMatch(/^Vull 7 \+ 5 \S+/)
    expect(prizeRequest(t).text).not.toMatch(/\b12\b/)
  })

  it('times lays the tray out in rows of b', () => {
    const t = prizeFromItem({ ...base, text: '3 × 4 = ?', answer: '12', operands: { a: 3, b: 4, op: '×' } })
    if (!t) throw new Error('sense tasca')
    expect(trayCols(t)).toBe(4)
    expect(prizeLayout(t).slots % 4).toBe(0)
  })

  it('every item of every duel skill in every CPA stage: the solution on the tray answers right, or the tags hold the answer', () => {
    const kinds = new Set<string>()
    fc.assert(
      fc.property(fc.constantFrom(...RECREATIUS_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const adapter = pickAdapter(RECREATIUS_ADAPTERS, it)
        const task = prizeFromItem(it)
        expect(adapter !== undefined).toBe(task !== undefined)
        if (!task) {
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        kinds.add(task.mode)
        const spec = prizeSpec(task, it, true)
        expect(spec.choose(spec.solution)?.value).toBe(it.answer)
        const things = (defs: readonly string[], tag: string) => defs.map((def, i) => ({ uid: `${tag}${i}`, def }))
        expect(solutionMoves(things(spec.start, 's'), things(spec.loose, 'l'), spec.solution).make).toEqual([])
        expect(prizeZones(task)[0]?.capacity ?? 0).toBeGreaterThanOrEqual(spec.start.length + spec.loose.length)
        expect(solutionPrizes(task)).toBeLessThanOrEqual(40)
        if (spec.choose(spec.start)) expect(spec.choose(spec.start)?.value).toBe(it.answer)
      }),
      { numRuns: 400 },
    )
    expect(kinds.has('sum')).toBe(true)
    expect(kinds.has('times')).toBe(true)
  })
})
