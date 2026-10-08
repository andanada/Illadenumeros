import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import type { SkillNode } from '../ambit/types'
import { newFactState, type FactState } from '../engine/leitner'
import { newSkillState } from '../engine/mastery'
import { dayKey } from '../engine/retention'
import { applyAnswer, type AnswerInput } from './applyAnswer'

const A4 = MATES_SKILLS.find((s) => s.id === 'A4') as SkillNode
const A2 = MATES_SKILLS.find((s) => s.id === 'A2') as SkillNode

const input = (over: Partial<AnswerInput> = {}): AnswerInput => ({
  skill: A4,
  factKey: 'add:2+3',
  correct: true,
  rtMs: 1200,
  hintsUsed: 0,
  cpaStage: 'concret',
  gameId: 'duel-llampec',
  sessionId: 's1',
  now: 1_000,
  ...over,
})

describe('applyAnswer', () => {
  it('a clean fast answer updates the fact, the skill and earns 3 petals', () => {
    const out = applyAnswer(input(), undefined, {}, ['add:2+3'], 'id1')
    expect(out.factState?.box).toBe(1)
    expect(out.skillState.attempts).toBe(1)
    expect(out.petals).toBe(3)
    expect(out.attempt).toMatchObject({ id: 'id1', skillId: 'A4', factKey: 'add:2+3', correct: true })
  })

  it('a correct answer after hints counts as help, not as a clean success', () => {
    const out = applyAnswer(input({ hintsUsed: 1 }), undefined, {}, ['add:2+3'], 'id2')
    expect(out.petals).toBe(1)
    expect(out.factState?.box).toBe(0)
    expect(out.skillState.correct).toBe(0)
  })

  it('a wrong answer earns no petals and never removes any', () => {
    const out = applyAnswer(input({ correct: false, misconception: 'off-by-one' }), undefined, {}, ['add:2+3'], 'id3')
    expect(out.petals).toBe(0)
    expect(out.attempt.misconception).toBe('off-by-one')
  })

  it('skills without facts do not create fact states', () => {
    const { factKey: _ignored, ...rest } = input({ skill: A2 })
    const out = applyAnswer(rest, undefined, {}, [], 'id4')
    expect(out.factState).toBeUndefined()
    expect(out.skillState.skillId).toBe('A2')
  })

  it('reports when a skill becomes mastered', () => {
    let skill = undefined
    let mastered = false
    for (let i = 0; i < 40; i++) {
      const { factKey: _k, ...rest } = input({ skill: A2, sessionId: `s${i % 2}`, now: i })
      const out = applyAnswer(rest, skill, {}, [], `x${i}`)
      skill = out.skillState
      mastered ||= out.becameMastered
    }
    expect(mastered).toBe(true)
  })
})

describe('applyAnswer: retention-based mastery of core skills', () => {
  const DAY = 86_400_000
  const NOW = new Date(2026, 9, 7, 12, 0).getTime()
  const keys = Array.from({ length: 25 }, (_, i) => `add:${i}+0`)
  const solid = (box: number, rts: number[]): Record<string, FactState> =>
    Object.fromEntries(keys.map((k) => [k, { ...newFactState(k, NOW), attempts: 6, correct: 6, box, recentRts: rts, dueAt: NOW + 30 * DAY, lastSeen: NOW - DAY }]))
  const nearlyMastered = { ...newSkillState('A4'), accuracy: 0.97, fluency: 1, mastery: 0.98, status: 'consolidant' as const, attempts: 60, correct: 58, sessions: ['a', 'b'] }
  const answer = (cleanDays: string[], facts: Record<string, FactState>, over: Partial<AnswerInput> = {}) =>
    applyAnswer(input({ factKey: keys[0] as string, now: NOW, cleanDays, ...over }), nearlyMastered, facts, keys, 'x')

  it('records today as a clean day only for answers without help', () => {
    expect(answer([], {}).cleanDays).toEqual([dayKey(NOW)])
    expect(answer([], {}, { hintsUsed: 1 }).cleanDays).toEqual([])
    expect(answer([], {}, { correct: false }).cleanDays).toEqual([])
  })

  it('becomes mastered only with automatised facts AND three clean days', () => {
    const facts = solid(5, [1000, 1100, 1200])
    const threeDays = [dayKey(NOW - 3 * DAY), dayKey(NOW - DAY)]
    expect(answer(threeDays, facts).becameMastered).toBe(true)
    expect(answer([dayKey(NOW - DAY)], facts).becameMastered).toBe(false)
  })

  it('is not mastered while the facts are slow (strict 3 s target, no 1.5x allowance)', () => {
    const slow = solid(5, [3800, 4000, 4200])
    expect(answer([dayKey(NOW - 3 * DAY), dayKey(NOW - DAY)], slow).becameMastered).toBe(false)
  })

  it('is not mastered when the facts are only in box 3', () => {
    expect(answer([dayKey(NOW - 3 * DAY), dayKey(NOW - DAY)], solid(3, [1000, 1000, 1000])).becameMastered).toBe(false)
  })
})
