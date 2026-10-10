import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import type { Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { FLECA_SKILLS } from '../flecaSkills'
import { FLECA_ADAPTERS } from './flecaAdapters'
import { playOf, wordsOf } from './flecaTasks'

const make = (skillId: string, seed: string, cpaStage: Item['cpaStage'] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage })
}

describe('Fleca: items to the trays', () => {
  it('every skill makes playable items: on the trays or with the price tags', () => {
    for (const skill of FLECA_SKILLS) {
      for (const stage of ['concret', 'pictoric', 'abstracte'] as const) {
        for (let n = 0; n < 12; n++) {
          const item = make(skill, `${skill}${stage}${n}`, stage)
          const adapted = FLECA_ADAPTERS.some((a) => a.canAdapt(item))
          expect(adapted).toBe(playOf(item) !== undefined)
          expect(item.choices.some((c) => c.value === item.answer)).toBe(true)
        }
      }
    }
  })

  it('3 x 6 becomes three rows of six and the words never say the product', () => {
    let found = false
    for (let n = 0; n < 60 && !found; n++) {
      const item = make('C3', `c3-${n}`)
      const play = playOf(item)
      if (play?.mode.kind !== 'array') continue
      found = true
      expect(play.mode.rows * play.mode.cols).toBe(Number(item.answer))
      const words = wordsOf(item, play).text
      expect(words).toContain(`${play.mode.rows} `)
      expect(words).not.toContain(item.answer + ' ')
    }
    expect(found).toBe(true)
  })

  it('a sharing item becomes trays; the sheet takes what does not fit', () => {
    const modes = new Set<string>()
    for (let n = 0; n < 40; n++) modes.add(playOf(make('C6', `c6-${n}`))?.mode.kind ?? 'sheet')
    expect(modes.has('share')).toBe(true)
    expect(playOf(make('D5', 'd5-a'))).toBeUndefined()
  })
})
