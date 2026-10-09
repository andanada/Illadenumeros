import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { MATES_SKILLS } from '../../../../ambits/mates/skills'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { pickAdapter } from '../../../errands/adapters'
import { PERRUQUERIA_SKILLS } from '../perruqueriaSkills'
import { addClip, clipFromItem, clipRequest, clipSolution, slotsOf, takeClip, TRAY_MAX } from './clipLogic'
import { clipAdapter, PERRUQUERIA_ADAPTERS } from './perruqueriaAdapters'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

const base: Item = { id: 'x', skillId: 'A7', text: '4 + 5 = ?', speech: '', answer: '9', choices: [{ value: '9' }, { value: '8' }, { value: '10' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret', operands: { a: 4, b: 5, op: '+' } }

describe('perruqueria skills', () => {
  it('are early-series addition skills that exist', () => {
    for (const id of PERRUQUERIA_SKILLS) expect(MATES_SKILLS.find((s) => s.id === id), id).toBeDefined()
    expect(PERRUQUERIA_SKILLS).toEqual(expect.arrayContaining(['A4', 'A7', 'A8']))
  })

  it('every item of every skill, in every CPA stage, is playable: adapted, or tags holding the answer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PERRUQUERIA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const adapter = pickAdapter(PERRUQUERIA_ADAPTERS, it)
        if (!adapter) {
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        expect(adapter.build(it).request.text.length).toBeGreaterThan(0)
        const task = clipFromItem(it)
        if (!task) throw new Error('adaptat sense tasca')
        expect(String(clipSolution(task))).toBe(it.answer)
        expect(clipSolution(task)).toBeLessThanOrEqual(TRAY_MAX)
      }),
      { numRuns: 400 },
    )
  })

  it('in fact none falls back to tags, for many seeds and all stages', () => {
    for (const skillId of PERRUQUERIA_SKILLS) for (const stage of CPA_STAGES) for (let s = 0; s < 30; s++) expect(clipFromItem(item(skillId, `p${s}`, stage)), `${skillId} ${stage} ${s}`).toBeDefined()
  })
})

describe('clip logic', () => {
  it('pair: two groups on each side, answer is the total', () => {
    const t = clipFromItem(base)
    expect(t).toMatchObject({ mode: 'pair', a: 4, b: 5 })
    expect(t && clipSolution(t)).toBe(9)
    expect(t && clipRequest(t).text).toMatch(/4 pinces a l’esquerra i 5 a la dreta: 4 \+ 5\. Gairebé un doble!/)
    expect(t && slotsOf(t).filter((s) => s.side === 'left')).toHaveLength(4)
  })

  it('doubles are named', () => {
    const t = clipFromItem({ ...base, text: '4 + 4 = ?', answer: '8', operands: { a: 4, b: 4, op: '+' } })
    expect(t && clipRequest(t).text).toMatch(/Vull 4 pinces a cada costat: 4 \+ 4\. És un doble!/)
  })

  it('more: she already wears some, the answer is what is missing (either order of the unknown)', () => {
    const last = clipFromItem({ ...base, skillId: 'A5', text: '6 + ? = 10', answer: '4' })
    expect(last).toMatchObject({ mode: 'more', a: 6, b: 4 })
    expect(last && clipSolution(last)).toBe(4)
    expect(last && slotsOf(last).filter((s) => s.state === 'worn')).toHaveLength(6)
    const first = clipFromItem({ ...base, skillId: 'A10', text: '? + 3 = 8', answer: '5' })
    expect(first).toMatchObject({ mode: 'more', a: 3, b: 5 })
    expect(first && clipRequest(first).text).toMatch(/Ja porto 3 pinces i en vull 8/)
  })

  it('refuses what clips cannot show and the tray stays inside its limits', () => {
    expect(clipFromItem({ ...base, operands: { a: 15, b: 9, op: '+' }, answer: '24', text: '15 + 9 = ?' })).toBeUndefined()
    expect(clipFromItem({ ...base, operands: { a: 3, b: 4, op: '×' } })).toBeUndefined()
    expect(clipFromItem({ ...base, answer: '1,5' })).toBeUndefined()
    expect(() => clipAdapter.toTask({ ...base, operands: undefined })).toThrow()
    expect(addClip(TRAY_MAX)).toBe(TRAY_MAX)
    expect(takeClip(0)).toBe(0)
  })
})
