import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { OPERATION_IDS } from '../ambit/types'
import { newSkillState, type SkillState } from './mastery'
import { coreOperation, introducibleOperations, isIntroductionBlocked } from './operationOrder'

const dominada = (id: string): SkillState => ({ ...newSkillState(id), status: 'dominada', mastery: 0.95, attempts: 60 })
const masterAll = (op: string): Record<string, SkillState> => Object.fromEntries(MATES_SKILLS.filter((s) => s.operation === op).map((s) => [s.id, dominada(s.id)]))
const skill = (id: string) => MATES_SKILLS.find((s) => s.id === id) as (typeof MATES_SKILLS)[number]

describe('strict order of new material: add -> sub -> mul -> div', () => {
  it('only addition can be introduced to a new child', () => {
    expect([...introducibleOperations(MATES_SKILLS, {})]).toEqual(['add'])
    expect(coreOperation(MATES_SKILLS, {})).toBe('add')
  })

  it('subtraction opens only when EVERY addition skill is dominada', () => {
    const almost = { ...masterAll('add'), A8: { ...dominada('A8'), status: 'consolidant' as const } }
    expect(introducibleOperations(MATES_SKILLS, almost).has('sub')).toBe(false)
    expect(introducibleOperations(MATES_SKILLS, masterAll('add')).has('sub')).toBe(true)
    expect(coreOperation(MATES_SKILLS, masterAll('add'))).toBe('sub')
  })

  it('division facts are not introduced before multiplication is mastered (even with the graph prerequisites met)', () => {
    const states = { ...masterAll('add'), ...masterAll('sub'), C4: dominada('C4'), C5: dominada('C5'), D2: dominada('D2'), D3: { ...dominada('D3'), status: 'consolidant' as const }, C6: dominada('C6') }
    expect(introducibleOperations(MATES_SKILLS, states).has('div')).toBe(false)
    expect(isIntroductionBlocked(skill('C7'), MATES_SKILLS, states)).toBe(true)
    const all = { ...states, D3: dominada('D3') }
    expect(introducibleOperations(MATES_SKILLS, all).has('div')).toBe(true)
    expect(isIntroductionBlocked(skill('C7'), MATES_SKILLS, all)).toBe(false)
  })

  it('never blocks skills without an operation (concepts, place value...)', () => {
    expect(isIntroductionBlocked(skill('C3'), MATES_SKILLS, {})).toBe(false)
    expect(isIntroductionBlocked(skill('A1'), MATES_SKILLS, {})).toBe(false)
    expect(isIntroductionBlocked(skill('C4'), MATES_SKILLS, {})).toBe(true)
  })

  it('everything is mastered: there is no core operation left', () => {
    const states = Object.assign({}, ...OPERATION_IDS.map(masterAll))
    expect(coreOperation(MATES_SKILLS, states)).toBeUndefined()
  })
})
