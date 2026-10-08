import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { factsForSkill } from '../../ambits/mates/facts'
import { newFactState, type FactState } from '../engine/leitner'
import { newSkillState, type SkillState } from '../engine/mastery'
import { reconcileStatuses } from './reconcile'

const NOW = 1_800_000_000_000
const dominada = (id: string): SkillState => ({ ...newSkillState(id), status: 'dominada', mastery: 0.95, accuracy: 0.95, attempts: 60, correct: 58, sessions: ['a', 'b'] })
const automatised = (id: string): Record<string, FactState> =>
  Object.fromEntries(factsForSkill(id).map((k) => [k, { ...newFactState(k, NOW), attempts: 6, box: 5, recentRts: [900, 1000, 1100] }]))

describe('reconcileStatuses (statuses recomputed on read, nothing written)', () => {
  it('downgrades a legacy "dominada" core skill that does not retain its facts', () => {
    const states = { A4: dominada('A4') }
    const out = reconcileStatuses(MATES_SKILLS, states, {}, {}, factsForSkill)
    expect(out.A4?.status).toBe('consolidant')
    expect(out.A4?.mastery).toBe(0.95)
    expect(states.A4.status).toBe('dominada')
  })

  it('keeps "dominada" when facts are automatised and there are 3 clean days', () => {
    const out = reconcileStatuses(MATES_SKILLS, { A4: dominada('A4') }, automatised('A4'), { A4: ['2026-01-01', '2026-01-03', '2026-01-09'] }, factsForSkill)
    expect(out.A4?.status).toBe('dominada')
  })

  it('does not touch skills without the operation gate nor other statuses', () => {
    const states = { A2: dominada('A2'), A4: { ...newSkillState('A4'), status: 'aprenent' as const } }
    const out = reconcileStatuses(MATES_SKILLS, states, {}, {}, factsForSkill)
    expect(out.A2?.status).toBe('dominada')
    expect(out.A4?.status).toBe('aprenent')
  })

  it('returns the same object when nothing changes', () => {
    const states = { A2: dominada('A2') }
    expect(reconcileStatuses(MATES_SKILLS, states, {}, {}, factsForSkill)).toBe(states)
  })
})
