import type { SkillNode } from '../../core/ambit/types'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newFactState, type FactState } from '../../core/engine/leitner'
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

  describe('core operation emphasis', () => {
    const done = (id: string): SkillState => ({ ...newSkillState(id), status: 'dominada', mastery: 0.95, attempts: 60 })
    const fact = (key: string, box: number): FactState => ({ ...newFactState(key, 0), attempts: 5, box })

    it('the challenge goes to the learning skill of the operation in progress', () => {
      const states = { A1: done('A1'), A3: done('A3'), A2: learning('A2'), A4: done('A4'), A5: done('A5'), A7: done('A7'), A8: done('A8'), A6: learning('A6') }
      expect(buildMissionPlan(MATES_SKILLS, states, 0)[1]?.skillIds).toEqual(['A6'])
    })

    it('the review step covers the operation in progress plus the earlier ones, never later ones', () => {
      const states = { A1: done('A1'), A3: done('A3'), A4: done('A4'), A5: done('A5'), A7: done('A7'), A8: done('A8'), A6: learning('A6'), B1: learning('B1') }
      const review = buildMissionPlan(MATES_SKILLS, states, 0)[3]?.skillIds ?? []
      for (const id of ['A4', 'A5', 'A6', 'A7', 'A8']) expect(review).toContain(id)
      for (const id of ['C4', 'C7', 'D4', 'B1']) expect(review).not.toContain(id)
    })

    it('the warm-up only offers fact skills that already have a fact in box 2 or higher', () => {
      const states = { A1: done('A1'), A3: done('A3'), A4: learning('A4'), A5: learning('A5') }
      const facts = { 'add:2+3': fact('add:2+3', 3), 'c10:3': fact('c10:3', 1) }
      expect(buildMissionPlan(MATES_SKILLS, states, 0, facts)[0]?.skillIds).toEqual(['A4'])
    })

    it('without facts in box 2+ the warm-up keeps every available duel skill', () => {
      const states = { A1: done('A1'), A3: done('A3'), A4: learning('A4') }
      expect(buildMissionPlan(MATES_SKILLS, states, 0, {})[0]?.skillIds).toContain('A4')
    })
  })
})
