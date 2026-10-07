import type { SkillNode } from '../../core/ambit/types'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState, type SkillState } from '../../core/engine/mastery'
import { buildMissionPlan } from './missionPlan'

const learning = (id: string): SkillState => ({ ...newSkillState(id), status: 'aprenent', mastery: 0.4 })

describe('buildMissionPlan', () => {
  it('has the 4 steps in order: warm-up, concept, free choice, review', () => {
    const plan = buildMissionPlan(MATES_SKILLS, {}, 0)
    expect(plan.map((s) => s.id)).toEqual(['calentament', 'repte', 'lliure', 'repas'])
    expect(plan[0]?.gameId).toBe('duel-llampec')
    expect(plan[3]?.gameId).toBe('repte-illa')
    expect(plan[3]?.maxRounds).toBe(6)
  })

  it('uses a non-warm-up game from the focus skill with 6 rounds', () => {
    const plan = buildMissionPlan(MATES_SKILLS, { A4: learning('A4') }, 3)
    const step = plan[1]
    expect(step?.skillIds).toEqual(['A4'])
    expect(['marc-magic']).toContain(step?.gameId)
    expect(step?.maxRounds).toBe(6)
  })

  it('offers 3 distinct free-choice games that exclude the concept game', () => {
    const plan = buildMissionPlan(MATES_SKILLS, { A4: learning('A4') }, 1)
    const free = plan[2]
    expect(free?.gameId).toBeUndefined()
    expect(free?.options).toHaveLength(3)
    expect(new Set(free?.options).size).toBe(3)
    expect(free?.options).not.toContain(plan[1]?.gameId)
  })

  it('never offers locked skills to the games', () => {
    const plan = buildMissionPlan(MATES_SKILLS, {}, 0)
    expect(plan[3]?.skillIds).not.toContain('A9')
  })

  it('uses the games of the new 3rd-grade skills', () => {
    const c = (id: string, games: SkillNode['games']): SkillNode => ({ id, code: id, grade: 3, title: id, prereqs: [], hasFacts: false, games, fluencyTargetMs: 3000 })
    const skills = [c('C3', ['fleca-files']), c('C6', ['llaminadures', 'repte-illa']), c('C9', ['botiga-pluja'])]
    const plan = buildMissionPlan(skills, { C3: learning('C3') }, 0)
    expect(plan[1]?.gameId).toBe('fleca-files')
    expect(plan[1]?.skillIds).toEqual(['C3'])
    const free = plan[2]?.options ?? []
    expect(free).not.toContain('fleca-files')
    expect(free).toContain('llaminadures')
    expect(free).toContain('botiga-pluja')
  })
})
