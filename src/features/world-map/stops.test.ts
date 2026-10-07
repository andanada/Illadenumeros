import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newSkillState, type SkillState } from '../../core/engine/mastery'
import type { SkillNode } from '../../core/ambit/types'
import { isRegionClosed, playableRegions, REGIONS, skillsOfRegion, starsFor, stopStatus } from './stops'

const st = (skillId: string, patch: Partial<SkillState>): SkillState => ({ ...newSkillState(skillId), ...patch })
const skill = (id: string) => {
  const s = MATES_SKILLS.find((x) => x.id === id)
  if (!s) throw new Error(id)
  return s
}

describe('starsFor', () => {
  it('maps status to 0-3 stars', () => {
    expect(starsFor(undefined)).toBe(0)
    expect(starsFor(st('A1', { status: 'nova' }))).toBe(0)
    expect(starsFor(st('A1', { status: 'bloquejada' }))).toBe(0)
    expect(starsFor(st('A1', { status: 'aprenent' }))).toBe(1)
    expect(starsFor(st('A1', { status: 'consolidant' }))).toBe(2)
    expect(starsFor(st('A1', { status: 'dominada' }))).toBe(3)
  })
})

describe('stopStatus', () => {
  it('keeps skills without prerequisites open', () => {
    expect(stopStatus(skill('A1'), {})).toBe('new')
  })
  it('locks a skill while its prerequisite is below 0.6 mastery', () => {
    expect(stopStatus(skill('A2'), { A1: st('A1', { mastery: 0.59, status: 'aprenent' }) })).toBe('locked')
  })
  it('unlocks a skill when prerequisites reach 0.6', () => {
    expect(stopStatus(skill('A2'), { A1: st('A1', { mastery: 0.6, status: 'consolidant' }) })).toBe('new')
  })
  it('treats a skill with saved progress as playable even if prerequisites are low', () => {
    expect(stopStatus(skill('A4'), { A4: st('A4', { status: 'aprenent', mastery: 0.3 }) })).toBe('started')
  })
})

const node = (id: string, grade: SkillNode['grade']): SkillNode => ({ id, code: id, grade, title: id, prereqs: [], hasFacts: false, games: ['fleca-files'], fluencyTargetMs: 3000 })

describe('regions', () => {
  it('makes 1r, 2n, 3r, 4t and 5è (Ciutat dels Decimals) playable', () => {
    expect(REGIONS.filter((r) => r.playable).map((r) => r.grade)).toEqual([1, 2, 3, 4, 5])
    expect(REGIONS.find((r) => r.grade === 5)?.name).toBe('Ciutat dels Decimals')
  })
  it('keeps the Ciutat dels Decimals closed until 4t is mastered, then opens its first stops', () => {
    const city = skillsOfRegion(MATES_SKILLS, { grade: 5 })
    expect(isRegionClosed(city, {})).toBe(true)
    const done = { D1: st('D1', { mastery: 0.8, status: 'consolidant' }), D7: st('D7', { mastery: 0.7, status: 'consolidant' }) }
    expect(isRegionClosed(city, done)).toBe(false)
    expect(stopStatus(skill('E1'), done)).toBe('new')
    expect(stopStatus(skill('E2'), done)).toBe('locked')
  })
  it('never calls an empty region closed', () => {
    expect(isRegionClosed([], {})).toBe(false)
  })
  it('groups skills by grade, in order', () => {
    const skills = [node('C1', 3), node('A1', 1), node('C2', 3), node('D1', 4)]
    expect(skillsOfRegion(skills, { grade: 3 }).map((s) => s.id)).toEqual(['C1', 'C2'])
    expect(playableRegions(skills).map((e) => e.region.grade)).toEqual([1, 3, 4])
  })
  it('leaves out playable regions that have no skills yet', () => {
    expect(playableRegions([node('A1', 1)]).map((e) => e.region.id)).toEqual(['bosc'])
  })
})
