import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import { CPA_STAGES, type Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { breakdown, sumCents } from '../../../../ui/visual/moneyLogic'
import { pickAdapter } from '../../../errands/adapters'
import { MERCAT_SKILLS } from '../mercatSkills'
import { coinPile, formatLike } from '../market/priceLogic'
import { MERCAT_ADAPTERS, marketModeOf } from './mercatAdapters'

const item = (skillId: string, seed: string, stage: (typeof CPA_STAGES)[number]): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage: stage })
}

describe('mercat skills', () => {
  it('is the whole fifth grade, E1 to E10, each with a generator', () => {
    expect(MERCAT_SKILLS).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'])
    for (const id of MERCAT_SKILLS) expect(matesAmbit.generators[id], id).toBeDefined()
  })

  it('every item of every skill at every CPA stage is playable: in the square, or as tags holding the answer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MERCAT_SKILLS), fc.string({ minLength: 1, maxLength: 8 }), fc.constantFrom(...CPA_STAGES), (skillId, seed, stage) => {
        const it = item(skillId, seed, stage)
        const mode = marketModeOf(it)
        const adapter = pickAdapter(MERCAT_ADAPTERS, it)
        if (mode.kind === 'sheet') {
          expect(adapter).toBeUndefined()
          expect(it.choices.map((c) => c.value)).toContain(it.answer)
          return
        }
        expect(adapter?.build(it).request.text.length).toBeGreaterThan(0)
        if (mode.kind === 'scale') {
          expect(String(mode.task.tenths)).toBe(it.answer)
        } else {
          // Paying exactly the target gives exactly the item's answer; the counter holds the pieces to do it.
          expect(formatLike(it.answer, mode.task.target)).toBe(it.answer)
          expect(sumCents(breakdown(mode.task.target))).toBe(mode.task.target)
          expect(coinPile(mode.task.target)).toEqual(expect.arrayContaining(breakdown(mode.task.target)))
        }
      }),
      { numRuns: 500 },
    )
  })

  it('discounts and sums are played with coins, tenths with the scale', () => {
    const kinds = (skill: string): Set<string> => new Set(Array.from({ length: 80 }, (_, i) => marketModeOf(item(skill, `m${i}`, 'concret')).kind))
    expect(kinds('E10').has('tray')).toBe(true)
    expect(kinds('E3').has('tray')).toBe(true)
    expect(kinds('E1').has('scale')).toBe(true)
  })
})
