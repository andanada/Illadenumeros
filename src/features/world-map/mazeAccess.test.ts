import { describe, expect, it } from 'vitest'
import type { SkillNode } from '../../core/ambit/types'
import { newSkillState, type SkillState, type SkillStatus } from '../../core/engine/mastery'
import { MIN_SKILLS_FOR_MAZE, mazeAccess, mazePath } from './mazeAccess'

const skill = (id: string): SkillNode => ({ id, code: id, grade: 3, title: id, prereqs: [], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: 3000 })
const state = (skillId: string, status: SkillStatus): SkillState => ({ ...newSkillState(skillId), status })

const skills = ['C1', 'C2', 'C3', 'C4', 'C5'].map(skill)

describe('mazeAccess', () => {
  it('opens with three skills that are being learned or mastered', () => {
    const states = { C1: state('C1', 'dominada'), C2: state('C2', 'aprenent'), C3: state('C3', 'consolidant') }
    const access = mazeAccess(skills, states)
    expect(access.open).toBe(true)
    expect(access.skillIds).toEqual(['C1', 'C2', 'C3'])
    expect(access.missing).toBe(0)
  })

  it('stays closed with fewer, saying how many are missing', () => {
    const states = { C1: state('C1', 'dominada'), C2: state('C2', 'nova'), C3: state('C3', 'bloquejada') }
    const access = mazeAccess(skills, states)
    expect(access.open).toBe(false)
    expect(access.skillIds).toEqual(['C1'])
    expect(access.missing).toBe(MIN_SKILLS_FOR_MAZE - 1)
  })

  it('ignores skills with no progress at all', () => {
    expect(mazeAccess(skills, {}).skillIds).toEqual([])
    expect(mazeAccess([], {}).open).toBe(false)
  })

  it('builds the play route with the skills in the query', () => {
    expect(mazePath(['C1', 'C2', 'C3'])).toBe('/play/laberint-aventura?skills=C1,C2,C3')
  })
})
