import { describe, expect, it } from 'vitest'
import type { AnswerOutcome } from '../../core/progress/applyAnswer'
import { addOutcome, emptySession, finishRound, isSessionFinished, toSummary } from './gameSession'
import { resolveSkillIds } from './useGameBase'

const outcome = (skillId: string, petals: number, becameMastered: boolean): AnswerOutcome =>
  ({ skillState: { skillId }, petals, becameMastered }) as unknown as AnswerOutcome

describe('gameSession', () => {
  it('accumulates petals and mastered skills without mutating', () => {
    const a = addOutcome(emptySession, outcome('A5', 2, true))
    const b = addOutcome(a, outcome('A5', 1, true))
    expect(emptySession.petals).toBe(0)
    expect(b.petals).toBe(3)
    expect(b.masteredSkillIds).toEqual(['A5'])
  })

  it('ignores a missing outcome', () => {
    expect(addOutcome(emptySession, undefined)).toBe(emptySession)
  })

  it('counts rounds and first-try successes into the summary', () => {
    const s = finishRound(finishRound(emptySession, true), false)
    expect(toSummary(s)).toEqual({ answered: 2, correct: 1, petals: 0, masteredSkillIds: [] })
  })

  it('detects the round limit', () => {
    const s = finishRound(emptySession, true)
    expect(isSessionFinished(s, 1)).toBe(true)
    expect(isSessionFinished(s, 2)).toBe(false)
    expect(isSessionFinished(s, undefined)).toBe(false)
  })

  it('restricts skills to the host selection with a safe fallback', () => {
    expect(resolveSkillIds(['A5', 'A3', 'A8'], undefined)).toEqual(['A5', 'A3', 'A8'])
    expect(resolveSkillIds(['A5', 'A3', 'A8'], ['A3', 'B2'])).toEqual(['A3'])
    expect(resolveSkillIds(['A5', 'A3', 'A8'], ['B2'])).toEqual(['A5'])
  })
})
