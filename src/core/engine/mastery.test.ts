import { describe, expect, it } from 'vitest'
import { newSkillState, statusFor, updateSkill } from './mastery'

describe('mastery', () => {
  it('a new skill state is "nova" with no attempts', () => {
    const skill = newSkillState('A4')
    expect(skill.status).toBe('nova')
    expect(skill.attempts).toBe(0)
    expect(skill.cpaStage).toBe('concret')
  })

  it('correct answers raise mastery and wrong ones lower it', () => {
    const up = updateSkill(newSkillState('A4'), { correct: true, fluentRatio: 1, sessionId: 's1', hasFacts: true })
    expect(up.mastery).toBeGreaterThan(0)
    const down = updateSkill(up, { correct: false, fluentRatio: 1, sessionId: 's1', hasFacts: true })
    expect(down.mastery).toBeLessThan(up.mastery)
  })

  it('skills without facts weigh accuracy only', () => {
    let skill = newSkillState('A2')
    for (let i = 0; i < 30; i++) {
      skill = updateSkill(skill, { correct: true, fluentRatio: 0, sessionId: `s${i % 2}`, hasFacts: false })
    }
    expect(skill.mastery).toBeGreaterThan(0.95)
    expect(skill.status).toBe('dominada')
  })

  it('needs attempts in two different sessions to be "dominada"', () => {
    let skill = newSkillState('A2')
    for (let i = 0; i < 30; i++) {
      skill = updateSkill(skill, { correct: true, fluentRatio: 1, sessionId: 'only-one', hasFacts: false })
    }
    expect(skill.status).toBe('consolidant')
  })

  it('maps mastery to status', () => {
    expect(statusFor({ mastery: 0.3, attempts: 5, sessions: 1 })).toBe('aprenent')
    expect(statusFor({ mastery: 0.7, attempts: 5, sessions: 1 })).toBe('consolidant')
    expect(statusFor({ mastery: 0.9, attempts: 10, sessions: 2 })).toBe('consolidant')
    expect(statusFor({ mastery: 0.9, attempts: 25, sessions: 2 })).toBe('dominada')
  })

  it('climbs CPA stages one at a time, never skipping the pictorial stage', () => {
    let skill = newSkillState('A4')
    const stages: string[] = []
    for (let i = 0; i < 12; i++) {
      skill = updateSkill(skill, { correct: true, fluentRatio: 1, sessionId: 's', hasFacts: true })
      stages.push(skill.cpaStage)
    }
    expect(stages[9]).toBe('pictoric')
    expect(stages[11]).toBe('pictoric')
  })

  it('tracks consecutive errors and resets them on a correct answer', () => {
    let skill = newSkillState('A4')
    skill = updateSkill(skill, { correct: false, fluentRatio: 0, sessionId: 's', hasFacts: true })
    skill = updateSkill(skill, { correct: false, fluentRatio: 0, sessionId: 's', hasFacts: true })
    expect(skill.consecutiveErrors).toBe(2)
    skill = updateSkill(skill, { correct: true, fluentRatio: 0, sessionId: 's', hasFacts: true })
    expect(skill.consecutiveErrors).toBe(0)
  })
})

describe('mastery hysteresis', () => {
  it('a mastered skill is not lost with a single slip', () => {
    let skill = newSkillState('A2')
    for (let i = 0; i < 30; i++) {
      skill = updateSkill(skill, { correct: true, fluentRatio: 0, sessionId: `s${i % 2}`, hasFacts: false })
    }
    expect(skill.status).toBe('dominada')
    const slipped = updateSkill(skill, { correct: false, fluentRatio: 0, sessionId: 's0', hasFacts: false })
    expect(slipped.status).toBe('dominada')
  })

  it('it is lost after sustained errors', () => {
    let skill = newSkillState('A2')
    for (let i = 0; i < 30; i++) {
      skill = updateSkill(skill, { correct: true, fluentRatio: 0, sessionId: `s${i % 2}`, hasFacts: false })
    }
    for (let i = 0; i < 6; i++) skill = updateSkill(skill, { correct: false, fluentRatio: 0, sessionId: 's0', hasFacts: false })
    expect(skill.status).not.toBe('dominada')
  })
})
