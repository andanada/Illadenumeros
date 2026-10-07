import { describe, expect, it } from 'vitest'
import type { AnswerResult } from '../../features/play/useQuestionFlow'
import { computeSummary, masteredFrom } from './summary'

const resultWith = (skillId: string, becameMastered: boolean): AnswerResult =>
  ({
    correct: true,
    itemDone: true,
    outcome: { skillState: { skillId }, becameMastered },
  }) as unknown as AnswerResult

describe('masteredFrom', () => {
  it('adds a newly mastered skill once', () => {
    const first = masteredFrom(resultWith('A4', true), [])
    expect(first).toEqual(['A4'])
    expect(masteredFrom(resultWith('A4', true), first)).toEqual(['A4'])
  })

  it('ignores results without mastery and does not mutate', () => {
    const prev = ['A1']
    expect(masteredFrom(resultWith('A4', false), prev)).toEqual(['A1'])
    expect(masteredFrom({ correct: false, itemDone: false }, prev)).toEqual(['A1'])
    expect(prev).toEqual(['A1'])
  })
})

describe('computeSummary', () => {
  it('computes petals earned during the game', () => {
    expect(computeSummary({ answered: 5, correct: 4, petalsAtStart: 10, petalsNow: 22, masteredSkillIds: ['A4'] })).toEqual({
      answered: 5,
      correct: 4,
      petals: 12,
      masteredSkillIds: ['A4'],
    })
  })

  it('never returns negative petals', () => {
    expect(computeSummary({ answered: 0, correct: 0, petalsAtStart: 10, petalsNow: 3, masteredSkillIds: [] }).petals).toBe(0)
  })
})
