import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addFinished, addLeftBehind, emptyStats, type FinishedQuestion } from './roundStats'

const q = (patch: Partial<FinishedQuestion> = {}): FinishedQuestion => ({ correct: true, clean: true, speed: 'fast', rtMs: 2000, ...patch })

describe('roundStats', () => {
  it('counts a fast clean answer and builds a streak', () => {
    const s = addFinished(addFinished(emptyStats, q()), q())
    expect(s).toMatchObject({ finished: 2, clean: 2, fast: 2, fastStreak: 2, bestStreak: 2 })
    expect(s.cleanRts).toEqual([2000, 2000])
  })

  it('a slow answer ends the streak but keeps the best', () => {
    const s = addFinished(addFinished(addFinished(emptyStats, q()), q()), q({ speed: 'calm', rtMs: 9000 }))
    expect(s).toMatchObject({ fastStreak: 0, bestStreak: 2, clean: 3, fast: 2 })
  })

  it('helped or revealed answers are finished but never clean', () => {
    const s = addFinished(emptyStats, q({ clean: false }))
    expect(s).toMatchObject({ finished: 1, clean: 0, fast: 0 })
    expect(s.cleanRts).toEqual([])
  })

  it('a target that swims away is not a wrong answer', () => {
    const s = addLeftBehind(addFinished(emptyStats, q()))
    expect(s).toMatchObject({ finished: 1, leftBehind: 1, missesInRow: 1, fastStreak: 0 })
    expect(addFinished(s, q()).missesInRow).toBe(0)
  })

  it('property: counters stay consistent', () => {
    const arb = fc.record({ correct: fc.boolean(), clean: fc.boolean(), speed: fc.constantFrom('fast', 'steady', 'calm' as const), rtMs: fc.integer({ min: 100, max: 30_000 }) })
    fc.assert(
      fc.property(fc.array(arb, { maxLength: 40 }), (list) => {
        const s = list.reduce((acc, item) => addFinished(acc, item), emptyStats)
        expect(s.finished).toBe(list.length)
        expect(s.fast).toBeLessThanOrEqual(s.clean)
        expect(s.clean).toBeLessThanOrEqual(s.finished)
        expect(s.bestStreak).toBeGreaterThanOrEqual(s.fastStreak)
        expect(s.cleanRts).toHaveLength(s.clean)
      }),
    )
  })
})
