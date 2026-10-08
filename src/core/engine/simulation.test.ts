import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { OPERATION_IDS } from '../ambit/types'
import { CARELESS_LEARNER, simulate, SLOW_LEARNER, STEADY_LEARNER, type TraceEvent } from './simulation.testutil'

const operationOf = (skillId: string) => MATES_SKILLS.find((s) => s.id === skillId)?.operation

describe('simulated learners (12 minutes a day, real selector, family planner and answer pipeline)', () => {
  const events: TraceEvent[] = []
  const steady = simulate(STEADY_LEARNER, 420, 'steady-1', true, (e) => events.push(e))

  it('a steady learner masters additions in a plausible number of days, then the other operations in order', () => {
    const d = steady.dayMastered
    // Facts need at least four spaced successes (days 0, 1, 3, 7) plus three clean days, so never in under two weeks.
    expect(d.add).toBeGreaterThanOrEqual(14)
    expect(d.add).toBeLessThanOrEqual(160)
    expect(d.sub).toBeGreaterThan(d.add ?? 0)
    expect(d.mul).toBeGreaterThan(d.sub ?? 0)
    expect(d.div).toBeGreaterThan(d.mul ?? 0)
    expect(OPERATION_IDS.every((op) => d[op] !== undefined)).toBe(true)
  })

  it('introduces no subtraction, multiplication or division fact before the earlier operation is mastered', () => {
    for (const [op, previous] of [['sub', 'add'], ['mul', 'sub'], ['div', 'mul']] as const) {
      const unlockedOn = steady.dayMastered[previous] ?? Infinity
      const early = events.filter((e) => e.selection.factKey !== undefined && operationOf(e.selection.skillId) === op && e.day < unlockedOn)
      expect(early.length, `${op} facts before ${previous} was mastered`).toBe(0)
    }
  })

  it('never has three new facts in flight when a brand-new fact is introduced', () => {
    expect(steady.maxInFlight).toBeLessThanOrEqual(3)
  })

  it('spends at least half of the questions on the operation in progress', () => {
    expect(steady.coreShare).toBeGreaterThanOrEqual(0.5)
  })

  it('keeps first-try accuracy in a comfortable zone', () => {
    expect(steady.accuracy).toBeGreaterThan(0.75)
    expect(steady.accuracy).toBeLessThan(0.95)
  })

  it('a careless learner (fast but only 70 % right) gets no false mastery', () => {
    const careless = simulate(CARELESS_LEARNER, 200, 'careless-1', false)
    expect(careless.dayMastered).toEqual({})
    expect(Object.values(careless.skillStates).filter((s) => s.status === 'dominada' && s.skillId.startsWith('A') && ['A4', 'A5', 'A7', 'A8'].includes(s.skillId))).toEqual([])
  })

  it('an accurate but slow learner (about 4 s per fact) is not "dominada" either: fluency is part of mastery', () => {
    const slow = simulate(SLOW_LEARNER, 200, 'slow-1', false)
    expect(slow.dayMastered).toEqual({})
    expect(slow.accuracy).toBeGreaterThan(0.9)
  })

  it('several seeds all master additions within the plausible window', () => {
    for (const seed of ['alpha', 'beta', 'gamma']) {
      const r = simulate(STEADY_LEARNER, 200, seed, false)
      expect(r.dayMastered.add, seed).toBeGreaterThanOrEqual(14)
      expect(r.dayMastered.add, seed).toBeLessThanOrEqual(160)
    }
  })
}, 120_000)
