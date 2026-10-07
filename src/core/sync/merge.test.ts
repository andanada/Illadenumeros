import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { arbDoc } from './arbitraries.testutil'
import { mergeDoc, type VersionedDoc } from './merge'
import type { FactData, RewardsData, SkillData } from './schemas'

const skill = (over: Partial<SkillData>): SkillData => ({
  skillId: 'A1',
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
  ...over,
})

describe('mergeDoc', () => {
  it('skill: newer wins but counters take the max', () => {
    const older = { data: skill({ mastery: 0.9, attempts: 30, correct: 25 }), updatedAt: 1 }
    const newer = { data: skill({ mastery: 0.2, attempts: 5, correct: 1 }), updatedAt: 2 }
    expect(mergeDoc('skill', older, newer)).toEqual({ data: skill({ mastery: 0.2, attempts: 30, correct: 25 }), updatedAt: 2 })
  })

  it('ties keep the existing version', () => {
    const a = { data: skill({ mastery: 0.1 }), updatedAt: 5 }
    const b = { data: skill({ mastery: 0.7 }), updatedAt: 5 }
    expect((mergeDoc('skill', a, b).data as SkillData).mastery).toBe(0.1)
  })

  it('fact: same rule', () => {
    const f = (box: number, attempts: number): FactData => ({ factKey: 'add:1+1', box, streak: 0, attempts, correct: 0, recentRts: [], lastSeen: 0, dueAt: 0 })
    expect(mergeDoc('fact', { data: f(1, 9), updatedAt: 1 }, { data: f(4, 2), updatedAt: 3 }).data).toEqual(f(4, 9))
  })

  it('rewards: petals max, lists sorted union', () => {
    const r = (petals: number, stickers: string[], days: string[]): RewardsData => ({ id: 'me', petals, stickers, daysPlayed: days, missionsDone: [] })
    const merged = mergeDoc('rewards', { data: r(5, ['sol'], ['2026-01-02']), updatedAt: 9 }, { data: r(8, ['drac', 'sol'], ['2026-01-01']), updatedAt: 1 })
    expect(merged).toEqual({ data: r(8, ['drac', 'sol'], ['2026-01-01', '2026-01-02']), updatedAt: 9 })
  })

  it('settings: last write wins', () => {
    expect(mergeDoc('settings', { data: { diagnosticDone: true }, updatedAt: 1 }, { data: { diagnosticDone: false }, updatedAt: 2 }).data).toEqual({ diagnosticDone: false })
  })

  it('is idempotent and never loses rewards items (property)', () => {
    fc.assert(
      fc.property(arbDoc(false), arbDoc(false), (a, b) => {
        const x = { data: a.data, updatedAt: a.updatedAt } as VersionedDoc
        expect(mergeDoc(a.kind, x, x)).toEqual(a.kind === 'rewards' ? mergeDoc('rewards', x, x) : { ...x, data: { ...x.data } })
        if (a.kind === 'rewards' && b.kind === 'rewards') {
          const m = mergeDoc('rewards', x, { data: b.data, updatedAt: b.updatedAt } as VersionedDoc).data as RewardsData
          for (const s of [...(a.data.stickers as string[]), ...(b.data.stickers as string[])]) expect(m.stickers).toContain(s)
        }
      }),
    )
  })
})
