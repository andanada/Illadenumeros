import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { FactData, RewardsData, SkillData } from '../src/lib/docSchemas.js'
import { mergeDoc, type VersionedDoc } from '../src/lib/merge.js'

const skill = (o: Partial<SkillData> = {}): SkillData => ({
  skillId: 's1',
  accuracy: 0.5,
  fluency: 0,
  mastery: 0.5,
  status: 'aprenent',
  cpaStage: 'concret',
  attempts: 1,
  correct: 1,
  sessions: [],
  recent: [],
  consecutiveErrors: 0,
  ...o,
})

const arbSkill = fc.record({
  mastery: fc.double({ min: 0, max: 1, noNaN: true }),
  attempts: fc.integer({ min: 0, max: 100 }),
  correct: fc.integer({ min: 0, max: 100 }),
  updatedAt: fc.integer({ min: 0, max: 5 }),
})
const toSkill = (r: { mastery: number; attempts: number; correct: number; updatedAt: number }): VersionedDoc => ({
  data: skill({ mastery: r.mastery, attempts: r.attempts, correct: r.correct }),
  updatedAt: r.updatedAt,
})

const arbSet = fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { maxLength: 5 })
const arbRewards = fc.record({
  petals: fc.integer({ min: 0, max: 50 }),
  stickers: arbSet,
  daysPlayed: arbSet,
  missionsDone: arbSet,
  updatedAt: fc.integer({ min: 0, max: 5 }),
})
const toRewards = (r: {
  petals: number
  stickers: string[]
  daysPlayed: string[]
  missionsDone: string[]
  updatedAt: number
}): VersionedDoc => ({
  data: { id: 'me', petals: r.petals, stickers: r.stickers, daysPlayed: r.daysPlayed, missionsDone: r.missionsDone } satisfies RewardsData,
  updatedAt: r.updatedAt,
})

describe('mergeDoc skill/fact', () => {
  it('takes the newer doc but max counters', () => {
    const old = { data: skill({ attempts: 10, correct: 8, mastery: 0.9 }), updatedAt: 1 }
    const newer = { data: skill({ attempts: 7, correct: 7, mastery: 0.4 }), updatedAt: 2 }
    const merged = mergeDoc('skill', old, newer)
    expect(merged.data).toMatchObject({ mastery: 0.4, attempts: 10, correct: 8 })
    expect(merged.updatedAt).toBe(2)
  })

  it('keeps existing on equal updatedAt', () => {
    const a = { data: skill({ mastery: 0.1 }), updatedAt: 5 }
    const b = { data: skill({ mastery: 0.9 }), updatedAt: 5 }
    expect(mergeDoc('skill', a, b).data).toMatchObject({ mastery: 0.1 })
  })

  it('does not let an older doc override but still raises counters', () => {
    const cur = { data: skill({ mastery: 0.8, attempts: 3, correct: 3 }), updatedAt: 9 }
    const stale = { data: skill({ mastery: 0.1, attempts: 20, correct: 15 }), updatedAt: 1 }
    expect(mergeDoc('skill', cur, stale).data).toMatchObject({ mastery: 0.8, attempts: 20, correct: 15 })
  })

  it('applies the same counter rule to facts', () => {
    const fact = (attempts: number, correct: number): FactData => ({
      factKey: 'x', box: 1, streak: 0, attempts, correct, recentRts: [], lastSeen: 0, dueAt: 0,
    })
    const m = mergeDoc('fact', { data: fact(4, 2), updatedAt: 1 }, { data: fact(9, 1), updatedAt: 2 })
    expect(m.data).toMatchObject({ attempts: 9, correct: 2 })
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(arbSkill, arbSkill, (x, y) => {
        const a = toSkill(x)
        const b = toSkill(y)
        const once = mergeDoc('skill', a, b)
        expect(mergeDoc('skill', once, b)).toEqual(once)
        expect(mergeDoc('skill', a, a)).toEqual(a)
      }),
    )
  })

  it('is associative', () => {
    fc.assert(
      fc.property(arbSkill, arbSkill, arbSkill, (x, y, z) => {
        const [a, b, c] = [toSkill(x), toSkill(y), toSkill(z)] as [VersionedDoc, VersionedDoc, VersionedDoc]
        expect(mergeDoc('skill', mergeDoc('skill', a, b), c)).toEqual(mergeDoc('skill', a, mergeDoc('skill', b, c)))
      }),
    )
  })

  it('never decreases counters', () => {
    fc.assert(
      fc.property(arbSkill, arbSkill, (x, y) => {
        const m = mergeDoc('skill', toSkill(x), toSkill(y)).data as SkillData
        expect(m.attempts).toBeGreaterThanOrEqual(Math.max(x.attempts, y.attempts))
        expect(m.correct).toBeGreaterThanOrEqual(Math.max(x.correct, y.correct))
      }),
    )
  })
})

describe('mergeDoc rewards', () => {
  it('takes max petals and unions sorted sets', () => {
    const a = toRewards({ petals: 5, stickers: ['b', 'a'], daysPlayed: ['d1'], missionsDone: [], updatedAt: 1 })
    const b = toRewards({ petals: 3, stickers: ['c', 'a'], daysPlayed: ['d2'], missionsDone: ['m'], updatedAt: 2 })
    expect(mergeDoc('rewards', a, b).data).toEqual({
      id: 'me', petals: 5, stickers: ['a', 'b', 'c'], daysPlayed: ['d1', 'd2'], missionsDone: ['m'],
    })
  })

  it('is idempotent, commutative on data, associative and never loses items', () => {
    fc.assert(
      fc.property(arbRewards, arbRewards, arbRewards, (x, y, z) => {
        const [a, b, c] = [toRewards(x), toRewards(y), toRewards(z)] as [VersionedDoc, VersionedDoc, VersionedDoc]
        expect(mergeDoc('rewards', a, a).data).toEqual(mergeDoc('rewards', a, a).data)
        const ab = mergeDoc('rewards', a, b)
        expect(mergeDoc('rewards', ab, b)).toEqual(ab)
        expect(mergeDoc('rewards', b, a).data).toEqual(ab.data)
        expect(mergeDoc('rewards', ab, c)).toEqual(mergeDoc('rewards', a, mergeDoc('rewards', b, c)))
        const merged = ab.data as RewardsData
        for (const item of x.stickers) expect(merged.stickers).toContain(item)
        for (const item of y.daysPlayed) expect(merged.daysPlayed).toContain(item)
        expect(merged.petals).toBeGreaterThanOrEqual(Math.max(x.petals, y.petals))
      }),
    )
  })
})

describe('mergeDoc settings', () => {
  it('is last-write-wins', () => {
    const a = { data: { theme: 'a' }, updatedAt: 1 }
    const b = { data: { theme: 'b' }, updatedAt: 2 }
    expect(mergeDoc('settings', a, b).data).toEqual({ theme: 'b' })
    expect(mergeDoc('settings', b, a).data).toEqual({ theme: 'b' })
    expect(mergeDoc('settings', { ...a, updatedAt: 2 }, b).data).toEqual({ theme: 'a' })
  })
})
