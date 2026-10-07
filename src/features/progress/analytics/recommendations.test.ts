import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../../ambits/mates/skills'
import { newFactState, type FactState } from '../../../core/engine/leitner'
import { newSkillState, type SkillState } from '../../../core/engine/mastery'
import { aggregateAttempts } from './aggregate'
import { buildRecommendations, MAX_RECOMMENDATIONS, type RecommendationInput } from './recommendations'
import { att, batch, DAY, NOW } from './testData'
import type { Attempt } from '../../../core/progress/applyAnswer'

const targetMs = () => 3000

function input(attempts: Attempt[], patch: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    now: NOW,
    skills: MATES_SKILLS,
    skillStates: {},
    factStates: {},
    aggregate: aggregateAttempts(attempts, NOW, targetMs),
    streak: 0,
    daysThisWeek: 0,
    ...patch,
  }
}
const ids = (r: RecommendationInput) => buildRecommendations(r).map((x) => x.id)
const sk = (id: string, patch: Partial<SkillState>): SkillState => ({ ...newSkillState(id), ...patch })
const fact = (key: string, patch: Partial<FactState>): FactState => ({ ...newFactState(key, 0), ...patch })

describe('buildRecommendations', () => {
  it('has nothing to say with an empty history', () => {
    expect(buildRecommendations(input([]))).toEqual([])
  })

  describe('low accuracy', () => {
    it('triggers below 65 % with at least 20 answers in 7 days', () => {
      expect(ids(input(batch(1, 20, (i) => ({ correct: i < 12 }))))).toContain('low-accuracy')
    })
    it('does not trigger at exactly 65 %', () => {
      expect(ids(input(batch(1, 20, (i) => ({ correct: i < 13 }))))).not.toContain('low-accuracy')
    })
    it('does not trigger with fewer than 20 answers', () => {
      expect(ids(input(batch(1, 19, { correct: false })))).not.toContain('low-accuracy')
    })
  })

  describe('no play', () => {
    it('triggers after 3 whole days without playing', () => {
      expect(ids(input(batch(3, 5)))).toContain('no-play')
    })
    it('does not trigger after 2 days', () => {
      expect(ids(input(batch(2, 5)))).not.toContain('no-play')
    })
    it('never triggers for a child who has not played yet', () => {
      expect(ids(input([]))).not.toContain('no-play')
    })
  })

  describe('stuck skill', () => {
    const stuck = [...batch(10, 12, (i) => ({ skillId: 'A8', correct: i < 6 })), ...batch(1, 12, (i) => ({ skillId: 'A8', correct: i < 6 }))]
    const states = { A8: sk('A8', { status: 'aprenent', mastery: 0.4, attempts: 24 }) }
    it('triggers with many attempts and no accuracy growth, naming the skill', () => {
      const recs = buildRecommendations(input(stuck, { skillStates: states }))
      const rec = recs.find((r) => r.id === 'stuck-skill')
      expect(rec?.text).toContain('Sumar passant per la desena')
    })
    it('does not trigger if accuracy is growing', () => {
      const growing = [...batch(10, 12, (i) => ({ skillId: 'A8', correct: i < 4 })), ...batch(1, 12, (i) => ({ skillId: 'A8', correct: i < 9 }))]
      expect(ids(input(growing, { skillStates: states }))).not.toContain('stuck-skill')
    })
    it('does not trigger for a mastered skill or with few attempts', () => {
      expect(ids(input(stuck, { skillStates: { A8: sk('A8', { status: 'dominada', mastery: 0.9, attempts: 24 }) } }))).not.toContain('stuck-skill')
      expect(ids(input(batch(1, 10, { skillId: 'A8', correct: false }), { skillStates: states }))).not.toContain('stuck-skill')
    })
  })

  describe('slow facts', () => {
    const slow = (key: string) => fact(key, { attempts: 6, correct: 5, box: 2, recentRts: [9000, 9500, 10_000] })
    it('triggers with 3 or more practised facts well above the target', () => {
      const factStates = { 'mul:7x8': slow('mul:7x8'), 'mul:6x7': slow('mul:6x7'), 'mul:7x9': slow('mul:7x9') }
      const rec = buildRecommendations(input([], { factStates })).find((r) => r.id === 'slow-facts')
      expect(rec?.text).toMatch(/7 × 8/)
    })
    it('does not trigger with only two slow facts', () => {
      expect(ids(input([], { factStates: { 'mul:7x8': slow('mul:7x8'), 'mul:6x7': slow('mul:6x7') } }))).not.toContain('slow-facts')
    })
    it('ignores facts practised fewer than 3 times', () => {
      const few = (key: string) => fact(key, { attempts: 2, correct: 2, recentRts: [20_000] })
      expect(ids(input([], { factStates: { 'mul:7x8': few('mul:7x8'), 'mul:6x7': few('mul:6x7'), 'mul:7x9': few('mul:7x9') } }))).not.toContain('slow-facts')
    })
  })

  describe('next region', () => {
    const grade1 = Object.fromEntries(MATES_SKILLS.filter((s) => s.grade === 1).map((s) => [s.id, sk(s.id, { status: 'dominada', mastery: 0.9, attempts: 30 })]))
    it('triggers when 80 % of a grade is mastered and the next one is barely started', () => {
      expect(ids(input([], { skillStates: grade1 }))).toContain('next-region')
    })
    it('does not trigger when only half of the grade is mastered', () => {
      const half = Object.fromEntries(Object.entries(grade1).slice(0, 5))
      expect(ids(input([], { skillStates: half }))).not.toContain('next-region')
    })
  })

  describe('habit', () => {
    it('celebrates 4 days in the week', () => {
      expect(ids(input([], { daysThisWeek: 4 }))).toContain('habit')
    })
    it('celebrates a 5 day streak', () => {
      expect(ids(input([], { streak: 5 }))).toContain('habit')
    })
    it('stays quiet with a smaller habit', () => {
      expect(ids(input([], { streak: 2, daysThisWeek: 2 }))).not.toContain('habit')
    })
  })

  it('shows at most 4, ordered by priority, and always with a gentle tone', () => {
    const attempts = [...batch(3, 25, (i) => ({ correct: i < 10 }))]
    const grade1 = Object.fromEntries(MATES_SKILLS.filter((s) => s.grade === 1).map((s) => [s.id, sk(s.id, { status: 'dominada', mastery: 0.9, attempts: 30 })]))
    const slow = (key: string) => fact(key, { attempts: 6, correct: 5, box: 2, recentRts: [9000, 9500, 10_000] })
    const recs = buildRecommendations(
      input([...attempts, att(NOW - 3 * DAY)], {
        skillStates: grade1,
        factStates: { 'mul:7x8': slow('mul:7x8'), 'mul:6x7': slow('mul:6x7'), 'mul:7x9': slow('mul:7x9') },
        streak: 6,
        daysThisWeek: 5,
      }),
    )
    expect(recs.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS)
    expect(recs.map((r) => r.priority)).toEqual([...recs.map((r) => r.priority)].sort((a, b) => a - b))
    const text = recs.map((r) => `${r.title} ${r.text}`).join(' ')
    expect(text).not.toMatch(/\bmalament\b|\bculpa\b|\bvaga\b|\bfracàs/i)
  })
})
