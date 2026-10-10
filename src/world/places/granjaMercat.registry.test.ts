import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState, type SkillState, type SkillStatus } from '../../core/engine/mastery'
import { PLACES } from './registry'
import { streetEntries } from './streetPlan'
import { isPlaceOpen, unlockHint } from './unlock'

const state = (skillId: string, status: SkillStatus, mastery = 0.5): SkillState => ({ ...newSkillState(skillId), status, mastery })
const states = (...list: SkillState[]): Record<string, SkillState> => Object.fromEntries(list.map((s) => [s.skillId, s]))
const mastered = (...ops: string[]): SkillState[] => MATES_SKILLS.filter((s) => s.operation !== undefined && ops.includes(s.operation)).map((s) => state(s.id, 'dominada', 0.95))

const byId = (id: string) => {
  const place = PLACES.find((p) => p.id === id)
  if (!place) throw new Error(`Sense lloc ${id}`)
  return place
}

describe('Granja and Mercat on the street', () => {
  it('are registered with their own game ids, skills and unlock rules', () => {
    expect(byId('granja')).toMatchObject({ gameId: 'poble-granja', title: 'la Granja', unlock: { operation: 'mul' } })
    expect(byId('mercat')).toMatchObject({ gameId: 'poble-mercat', title: 'el Mercat', unlock: { grade: 5 } })
    expect(byId('granja').skills).toEqual(expect.arrayContaining(['C3', 'C4', 'C6', 'C7', 'D4', 'D6']))
    expect(byId('mercat').skills).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'])
  })

  it('show as built places (with a façade) instead of scaffolding', () => {
    const entries = streetEntries(PLACES)
    for (const id of ['granja', 'mercat']) {
      const lot = entries.find((e) => e.id === id)
      expect(lot?.place, id).toBeDefined()
      expect(typeof lot?.place?.facade).not.toBe('string')
    }
    expect(entries.find((e) => e.id === 'granja')?.name).toBe('la Granja')
    expect(entries.find((e) => e.id === 'mercat')?.name).toBe('el Mercat')
  })

  it('the farm opens once multiplying has started; the market with the 5è region', () => {
    expect(isPlaceOpen(byId('granja'), { skillStates: {} })).toBe(false)
    expect(isPlaceOpen(byId('granja'), { skillStates: states(...mastered('add', 'sub'), state('C4', 'aprenent')) })).toBe(true)
    expect(isPlaceOpen(byId('mercat'), { skillStates: {} })).toBe(false)
    expect(isPlaceOpen(byId('mercat'), { skillStates: states(state('D1', 'consolidant', 0.8), state('D7', 'consolidant', 0.8)) })).toBe(true)
  })

  it('tell the adults plainly what opens them', () => {
    expect(unlockHint(byId('granja').unlock)).toBe('S’obre quan domini les sumes i les restes i comenci les multiplicacions')
    expect(unlockHint(byId('mercat').unlock)).toBe('S’obre amb els continguts de 5è')
  })
})
