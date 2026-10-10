import { describe, expect, it } from 'vitest'
import { matesAmbit } from '../../../../ambits/mates'
import type { Item } from '../../../../core/ambit/types'
import { createRng } from '../../../../core/rng'
import { PIZZERIA_SKILLS } from '../pizzeriaSkills'
import { PIZZERIA_ADAPTERS } from './pizzeriaAdapters'
import { playOf, wordsOf } from './pizzeriaTasks'

const make = (skillId: string, seed: string, cpaStage: Item['cpaStage'] = 'concret'): Item => {
  const gen = matesAmbit.generators[skillId]
  if (!gen) throw new Error(skillId)
  return gen({ rng: createRng(seed), cpaStage })
}

describe('Pizzeria: items to the plates and the cutter', () => {
  it('every skill makes playable items, in the room or with the price tags', () => {
    for (const skill of PIZZERIA_SKILLS) {
      for (const stage of ['concret', 'pictoric', 'abstracte'] as const) {
        for (let n = 0; n < 12; n++) {
          const item = make(skill, `${skill}${stage}${n}`, stage)
          expect(PIZZERIA_ADAPTERS.some((a) => a.canAdapt(item))).toBe(playOf(item) !== undefined)
          expect(item.choices.some((c) => c.value === item.answer)).toBe(true)
        }
      }
    }
  })

  it('sharing, parts of a collection and cut-and-give all appear', () => {
    const seen = new Set<string>()
    for (const skill of ['C6', 'C7', 'D6', 'C8', 'D7']) {
      for (let n = 0; n < 40; n++) {
        const play = playOf(make(skill, `${skill}-${n}`))
        if (!play) continue
        seen.add(play.mode.kind === 'cut' ? 'cut' : play.mode.task.ask)
      }
    }
    expect([...seen].sort()).toEqual(['cut', 'part', 'quotient', 'remainder'])
  })

  it('equivalent fractions go to the price tags', () => {
    for (let n = 0; n < 10; n++) expect(playOf(make('E9', `e9-${n}`))).toBeUndefined()
  })

  it('the words of a cut name the parts and the slices, never the fraction answer as such', () => {
    for (let n = 0; n < 60; n++) {
      const item = make('C8', `c8-${n}`)
      const play = playOf(item)
      if (play?.mode.kind !== 'cut') continue
      expect(wordsOf(play).text).toBe(`Talla la pizza en ${play.mode.parts} parts iguals i dóna’n ${play.mode.selected} a la clienta.`)
      return
    }
    throw new Error('Cap tall de C8 en 60 intents')
  })
})
