import { describe, expect, it } from 'vitest'
import { newSkillState, skillStateSchema, updateSkill } from './mastery'

describe('SkillState.updatedAt (sync)', () => {
  it('updateSkill stamps updatedAt with the injected now', () => {
    const next = updateSkill(newSkillState('A4'), { correct: true, fluentRatio: 0, sessionId: 's', hasFacts: false, now: 1234 })
    expect(next.updatedAt).toBe(1234)
  })

  it('without now the previous updatedAt is kept', () => {
    const next = updateSkill({ ...newSkillState('A4'), updatedAt: 99 }, { correct: true, fluentRatio: 0, sessionId: 's', hasFacts: false })
    expect(next.updatedAt).toBe(99)
  })

  it('old rows without updatedAt still parse', () => {
    const { updatedAt: _u, ...old } = { ...newSkillState('A1'), updatedAt: 1 }
    expect(skillStateSchema.safeParse(old).success).toBe(true)
    expect(skillStateSchema.parse({ ...old, updatedAt: 5 }).updatedAt).toBe(5)
  })
})
