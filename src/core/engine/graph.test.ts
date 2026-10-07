import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import type { SkillNode } from '../ambit/types'
import { ancestorsOf, isUnlocked, validateGraph } from './graph'

const node = (id: string, prereqs: string[]): SkillNode => ({
  id, code: id, grade: 1, title: id, prereqs, hasFacts: false, games: ['repte-illa'], fluencyTargetMs: 3000,
})

describe('graph', () => {
  it('the real maths graph has no cycles and no missing prerequisites', () => {
    expect(() => validateGraph(MATES_SKILLS)).not.toThrow()
  })

  it('detects cycles', () => {
    expect(() => validateGraph([node('a', ['b']), node('b', ['a'])])).toThrow(/Cicle/)
  })

  it('detects missing prerequisites and duplicated ids', () => {
    expect(() => validateGraph([node('a', ['zz'])])).toThrow(/inexistent/)
    expect(() => validateGraph([node('a', []), node('a', [])])).toThrow(/repetit/)
  })

  it('collects transitive ancestors', () => {
    expect([...ancestorsOf(MATES_SKILLS, 'A8')].sort()).toEqual(['A1', 'A3', 'A4', 'A5', 'A7'])
  })

  it('unlocks a skill only when every prerequisite reaches 0.6', () => {
    const a8 = MATES_SKILLS.find((s) => s.id === 'A8') as SkillNode
    expect(isUnlocked(a8, (id) => (id === 'A5' ? 0.8 : 0.5))).toBe(false)
    expect(isUnlocked(a8, () => 0.6)).toBe(true)
  })
})
