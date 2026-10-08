import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { factsForSkill } from '../../../ambits/mates/facts'
import { OPERATIONS } from '../../../ambits/mates/operations'
import { MATES_SKILLS } from '../../../ambits/mates/skills'
import { newFactState, type FactState } from '../../../core/engine/leitner'
import { newSkillState, type SkillState } from '../../../core/engine/mastery'
import { createRng } from '../../../core/rng'
import { MAX_NEW_FACTS, planRoundFacts, spreadDuplicates, type PlanInput } from './speedPlan'

const operation = (id: string) => {
  const found = OPERATIONS.find((o) => o.id === id)
  if (!found) throw new Error(`operation ${id} missing`)
  return found
}

const learning = (id: string): SkillState => ({ ...newSkillState(id), status: 'aprenent', mastery: 0.7 })
const fact = (key: string, patch: Partial<FactState>): FactState => ({ ...newFactState(key, 0), attempts: 5, ...patch })

const base = (patch: Partial<PlanInput> = {}): PlanInput => ({
  operation: operation('add'),
  skills: MATES_SKILLS,
  skillStates: { A3: learning('A3'), A4: learning('A4') },
  factStates: {},
  factsForSkill,
  count: 20,
  rng: createRng('plan'),
  ...patch,
})

const a4 = factsForSkill('A4')
const slowSeen = (keys: string[], box = 3): Record<string, FactState> =>
  Object.fromEntries(keys.map((k) => [k, fact(k, { box, recentRts: [9000, 9000, 9000] })]))

describe('planRoundFacts', () => {
  it('returns exactly `count` planned facts of the operation', () => {
    const plan = planRoundFacts(base())
    expect(plan).toHaveLength(20)
    const owned = operation('add').skillIds.flatMap((s) => factsForSkill(s))
    expect(plan.every((p) => owned.includes(p.factKey))).toBe(true)
  })

  it('never introduces more than 3 new facts, even for a brand new player', () => {
    const plan = planRoundFacts(base())
    expect(new Set(plan.filter((p) => p.kind === 'new').map((p) => p.factKey)).size).toBeLessThanOrEqual(MAX_NEW_FACTS)
  })

  it('is about 70 % review of slow facts from box 2 or higher and at most 10 % new', () => {
    const plan = planRoundFacts(base({ factStates: slowSeen(a4.slice(0, 20)) }))
    expect(plan.filter((p) => p.kind === 'review').length).toBeGreaterThanOrEqual(13)
    expect(plan.filter((p) => p.kind === 'new').length).toBeLessThanOrEqual(2)
    expect(plan.some((p) => p.kind === 'consolidation')).toBe(false)
  })

  it('fills 20 % with consolidation when facts in low boxes exist', () => {
    const states = { ...slowSeen(a4.slice(0, 12)), ...slowSeen(a4.slice(12, 24), 1) }
    const plan = planRoundFacts(base({ factStates: states }))
    expect(plan.filter((p) => p.kind === 'consolidation').length).toBeGreaterThanOrEqual(3)
  })

  it('does not treat fluent facts as review material', () => {
    const fluent = Object.fromEntries(a4.map((k) => [k, fact(k, { box: 4, recentRts: [900, 900, 900] })]))
    const plan = planRoundFacts(base({ factStates: fluent }))
    expect(plan.filter((p) => p.kind === 'review')).toHaveLength(0)
  })

  it('stays inside unlocked skills (A8 is locked until A5 and A7 are known)', () => {
    const plan = planRoundFacts(base())
    expect(plan.some((p) => p.skillId === 'A8')).toBe(false)
  })

  it('honours restrictTo and falls back to the first allowed skill when nothing is open', () => {
    expect(planRoundFacts(base({ restrictTo: ['A4'] })).every((p) => p.skillId === 'A4')).toBe(true)
    const locked = planRoundFacts(base({ skillStates: {}, restrictTo: ['A8'] }))
    expect(locked.length).toBe(20)
    expect(locked.every((p) => p.skillId === 'A8')).toBe(true)
  })

  it('can be switched to another operation by data', () => {
    const states = { A4: learning('A4'), A6: learning('A6') }
    const plan = planRoundFacts(base({ operation: operation('sub'), skillStates: states }))
    expect(plan.every((p) => p.factKey.startsWith('sub:'))).toBe(true)
  })

  it('avoids asking the same fact twice in a row when there is a choice', () => {
    const plan = planRoundFacts(base({ factStates: slowSeen(a4.slice(0, 10)) }))
    plan.slice(1).forEach((p, i) => expect(p.factKey).not.toBe(plan[i]?.factKey))
  })

  it('property: deterministic, exact length, new facts capped', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 1, max: 30 }), fc.integer({ min: 0, max: 40 }), (seed, count, seen) => {
        const input = (): PlanInput => base({ count, rng: createRng(seed), factStates: slowSeen(a4.slice(0, seen), 2) })
        const first = planRoundFacts(input())
        expect(first).toHaveLength(count)
        expect(first).toEqual(planRoundFacts(input()))
        expect(new Set(first.filter((p) => p.kind === 'new').map((p) => p.factKey)).size).toBeLessThanOrEqual(MAX_NEW_FACTS)
      }),
      { numRuns: 60 },
    )
  })
})

describe('spreadDuplicates', () => {
  it('keeps the same facts', () => {
    const p = (factKey: string) => ({ factKey, skillId: 'A4', kind: 'review' as const })
    const plan = [p('a'), p('a'), p('b'), p('c')]
    const out = spreadDuplicates(plan)
    expect([...out].map((x) => x.factKey).sort()).toEqual(['a', 'a', 'b', 'c'])
    expect(out[0]?.factKey).not.toBe(out[1]?.factKey)
  })
})
