import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import type { SkillNode } from '../ambit/types'
import { newSkillState } from '../engine/mastery'
import { applyAnswer } from './applyAnswer'

const A4 = MATES_SKILLS.find((s) => s.id === 'A4') as SkillNode
const base = { skill: A4, factKey: 'add:2+3', correct: true, rtMs: 1200, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'duel-llampec' as const, sessionId: 's1', now: 5_000 }

describe('applyAnswer stamps updatedAt', () => {
  it('sets the skill updatedAt from now', () => {
    expect(applyAnswer(base, undefined, {}, ['add:2+3'], 'id1').skillState.updatedAt).toBe(5_000)
  })
  it('a retry does not move the skill nor its updatedAt', () => {
    const before = { ...newSkillState('A4'), updatedAt: 10 }
    expect(applyAnswer({ ...base, retry: true }, before, {}, ['add:2+3'], 'id2').skillState.updatedAt).toBe(10)
  })
})
