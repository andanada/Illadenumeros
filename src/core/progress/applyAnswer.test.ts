import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import type { SkillNode } from '../ambit/types'
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
