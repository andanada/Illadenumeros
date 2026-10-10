import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { pickAdapter } from '../../../errands/adapters'
import { GRANJA_SKILLS } from '../granjaSkills'
import { evaluateShare } from '../share/shareLogic'
import { farmModeOf, GRANJA_ADAPTERS } from './granjaAdapters'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number]): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

describe('granja skills', () => {
  it('serves multiplication, sharing and dividing; every one has a generator', () => {
    for (const id of ['C3', 'C4', 'C6', 'C7', 'D4', 'D6', 'E7']) expect(GRANJA_SKILLS).toContain(id)
    for (const id of GRANJA_SKILLS) expect(matesAmbit.generators[id], id).toBeDefined()
  })

  it('every item of every skill at every CPA stage is playable: in the world, or as tags holding the answer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...GRANJA_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const mode = farmModeOf(it)
        const adapter = pickAdapter(GRANJA_ADAPTERS, it)
        if (mode.kind === 'sheet') {
          expect(adapter).toBeUndefined()
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        expect(adapter?.build(it).request.text.length).toBeGreaterThan(0)
        if (mode.kind === 'plant') {
          expect(String(mode.task.rows * mode.task.cols)).toBe(it.answer)
        } else {
          // Doing the sharing right gives exactly the answer the engine wants.
          const t = mode.task
          const bowls = t.mode === 'groups' ? Array.from({ length: t.parts }, () => t.size) : Array.from({ length: t.parts }, () => Math.floor(t.total / t.size))
          const pile = t.mode === 'groups' ? t.total - t.parts * t.size : t.total % t.size
          expect(String(evaluateShare(t, bowls, pile).value)).toBe(it.answer)
        }
      }),
      { numRuns: 500 },
    )
  })

  it('most multiplication facts and divisions are played in the world', () => {
    let world = 0
    for (let i = 0; i < 60; i++) if (farmModeOf(item('C4', `s${i}`, 'concret')).kind !== 'sheet') world++
    expect(world).toBeGreaterThan(25)
    let share = 0
    for (let i = 0; i < 60; i++) if (farmModeOf(item('C7', `s${i}`, 'concret')).kind === 'share') share++
    expect(share).toBeGreaterThan(20)
  })
})
