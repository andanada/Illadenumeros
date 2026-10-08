import { describe, expect, it } from 'vitest'
import { newFactState, type FactState } from './leitner'
import { addCleanDay, cleanDaysFromAttempts, dayKey, factRetention, isAutomatised, retentionPasses } from './retention'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 7, 12, 0).getTime()

const fact = (key: string, box: number, rts: number[] = [1200, 1500, 1800]): FactState => ({ ...newFactState(key, NOW), attempts: 5, box, recentRts: rts })

describe('automatised facts', () => {
  it('needs box >= 4 and a median response within the strict target', () => {
    expect(isAutomatised(fact('add:1+2', 4), 3000)).toBe(true)
    expect(isAutomatised(fact('add:1+2', 3), 3000)).toBe(false)
    expect(isAutomatised(fact('add:1+2', 5, [3500, 3600, 3700]), 3000)).toBe(false)
    expect(isAutomatised(fact('add:1+2', 5, []), 3000)).toBe(false)
  })

  it('uses the strict target, not the 1.5x allowance', () => {
    expect(isAutomatised(fact('add:1+2', 4, [4000, 4000, 4000]), 3000)).toBe(false)
    expect(isAutomatised(fact('mul:3x4', 4, [3900, 3900, 3900]), 4000)).toBe(true)
  })
})

describe('factRetention', () => {
  const keys = ['a', 'b', 'c', 'd', 'e']
  it('counts automatised, in review and unseen facts', () => {
    const states = { a: fact('a', 5), b: fact('b', 4), c: fact('c', 2), d: { ...newFactState('d', NOW) } }
    const r = factRetention(keys, states, 3000)
    expect(r).toEqual({ total: 5, automatised: 2, inReview: 1, unseen: 2, share: 0.4 })
  })

  it('an empty fact list has share 0 (never mastered by default)', () => {
    expect(factRetention([], {}, 3000).share).toBe(0)
  })
})

describe('clean days', () => {
  it('adds each local day once and forgets days older than the window', () => {
    const once = addCleanDay([], NOW)
    expect(addCleanDay(once, NOW + 1000)).toEqual(once)
    const old = [dayKey(NOW - 200 * DAY)]
    expect(addCleanDay(old, NOW)).toEqual([dayKey(NOW)])
    expect(addCleanDay([dayKey(NOW - DAY)], NOW)).toEqual([dayKey(NOW - DAY), dayKey(NOW)])
  })

  it('is rebuilt from attempts: only correct answers without help count', () => {
    const attempts = [
      { skillId: 'A4', correct: true, hintsUsed: 0, createdAt: NOW },
      { skillId: 'A4', correct: true, hintsUsed: 1, createdAt: NOW - DAY },
      { skillId: 'A4', correct: false, hintsUsed: 0, createdAt: NOW - 2 * DAY },
      { skillId: 'A4', correct: true, hintsUsed: 0, createdAt: NOW - 3 * DAY },
      { skillId: 'A5', correct: true, hintsUsed: 0, createdAt: NOW - 3 * DAY },
    ]
    expect(cleanDaysFromAttempts(attempts, NOW)).toEqual({ A4: [dayKey(NOW - 3 * DAY), dayKey(NOW)], A5: [dayKey(NOW - 3 * DAY)] })
  })
})

describe('retentionPasses', () => {
  it('gain needs 90 % automatised and 3 clean days; keep is more lenient', () => {
    expect(retentionPasses({ share: 0.9, cleanDays: 3 }, 'gain')).toBe(true)
    expect(retentionPasses({ share: 0.89, cleanDays: 3 }, 'gain')).toBe(false)
    expect(retentionPasses({ share: 0.95, cleanDays: 2 }, 'gain')).toBe(false)
    expect(retentionPasses({ share: 0.8, cleanDays: 5 }, 'keep')).toBe(true)
    expect(retentionPasses({ share: 0.7, cleanDays: 5 }, 'keep')).toBe(false)
  })
})
