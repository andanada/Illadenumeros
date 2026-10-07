import { describe, expect, it } from 'vitest'
import type { SkillNode } from '../../../core/ambit/types'
import { newSkillState, type SkillState } from '../../../core/engine/mastery'
import { MATES_SKILLS } from '../../../ambits/mates/skills'
import { groupByGrade, skillStatusOf } from './skillStatus'

const skill = (id: string, prereqs: string[] = [], grade: SkillNode['grade'] = 1): SkillNode => ({
  id, code: id, grade, title: id, prereqs, hasFacts: false, games: [], fluencyTargetMs: 3000,
})
const st = (id: string, patch: Partial<SkillState>): SkillState => ({ ...newSkillState(id), ...patch })

describe('skillStatusOf', () => {
  it('is nova without state and without prerequisites', () => {
    expect(skillStatusOf(skill('A1'), {})).toBe('nova')
  })
  it('is bloquejada when prerequisites are not reached and there is no progress', () => {
    expect(skillStatusOf(skill('A2', ['A1']), {})).toBe('bloquejada')
  })
  it('is nova once prerequisites reach 60 % mastery', () => {
    expect(skillStatusOf(skill('A2', ['A1']), { A1: st('A1', { mastery: 0.6 }) })).toBe('nova')
  })
  it('keeps the stored status of a skill with progress, even if prerequisites are low', () => {
    expect(skillStatusOf(skill('A2', ['A1']), { A2: st('A2', { status: 'aprenent', attempts: 3 }) })).toBe('aprenent')
  })
})

describe('groupByGrade', () => {
  it('groups the real skills by grade 1..4 in order', () => {
    const groups = groupByGrade(MATES_SKILLS)
    expect(groups.map((g) => g.grade)).toEqual([1, 2, 3, 4])
    expect(groups.map((g) => g.label)).toEqual(['1r', '2n', '3r', '4t'])
    expect(groups.reduce((n, g) => n + g.skills.length, 0)).toBe(MATES_SKILLS.filter((s) => s.grade <= 4).length)
  })
})
