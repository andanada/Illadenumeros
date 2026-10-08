import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { compareWithPast, medianOf, type PastAttempt } from './personalBest'

const NOW = new Date(2026, 9, 8, 12, 0, 0).getTime()
const DAY = 24 * 60 * 60 * 1000
const attempt = (daysAgo: number, rtMs: number, patch: Partial<PastAttempt> = {}): PastAttempt => ({
  gameId: 'tren-sumes',
  correct: true,
  hintsUsed: 0,
  rtMs,
  createdAt: NOW - daysAgo * DAY,
  ...patch,
})
const many = (daysAgo: number, rt: number, n = 5): PastAttempt[] => Array.from({ length: n }, () => attempt(daysAgo, rt))

describe('medianOf', () => {
  it('handles empty, odd and even lists', () => {
    expect(medianOf([])).toBeUndefined()
    expect(medianOf([3, 1, 2])).toBe(2)
    expect(medianOf([4, 1, 2, 3])).toBe(2.5)
  })
})

describe('compareWithPast', () => {
  it('celebrates being faster than yesterday', () => {
    const r = compareWithPast(many(1, 6000), [3000, 3500, 4000, 3000], NOW)
    expect(r.headline).toBe('Avui has anat més ràpid que ahir!')
    expect(r.faster).toBe(true)
  })

  it('compares with earlier rounds of the same day', () => {
    const r = compareWithPast(many(0.1, 6000), [3000, 3000, 3000], NOW)
    expect(r.headline).toBe('Has anat més ràpid que a la ronda d’abans!')
  })

  it('uses a softer sentence when the last play was older', () => {
    expect(compareWithPast(many(5, 6000), [3000, 3000, 3000], NOW).headline).toBe('Has anat més ràpid que l’última vegada!')
  })

  it('flags a personal record when faster than every earlier day', () => {
    const past = [...many(1, 6000), ...many(3, 5000)]
    expect(compareWithPast(past, [3000, 3000, 3000], NOW).record).toBe(true)
    expect(compareWithPast([...many(1, 6000), ...many(3, 2000)], [3000, 3000, 3000], NOW).record).toBe(false)
  })

  it('stays kind when the round was not faster', () => {
    const r = compareWithPast(many(1, 3000), [6000, 6000, 6000], NOW)
    expect(r.faster).toBe(false)
    expect(r.headline).toBe('Bon ritme! Cada ronda et fa més àgil.')
  })

  it('welcomes the first round and ignores helped, wrong and other-game attempts', () => {
    expect(compareWithPast([], [3000, 3000, 3000], NOW).headline).toBe('Ja tenim el teu ritme! La pròxima vegada, a superar-lo.')
    const noise = [1, 2, 3, 4].flatMap(() => [attempt(1, 1000, { correct: false }), attempt(1, 1000, { hintsUsed: 1 }), attempt(1, 1000, { gameId: 'marc-magic' })])
    expect(compareWithPast(noise, [3000, 3000, 3000], NOW).faster).toBe(false)
  })

  it('needs a few answers before comparing', () => {
    expect(compareWithPast(many(1, 6000), [1000], NOW).faster).toBe(false)
  })

  it('property: never shows numbers, grades or negative words', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 200, max: 30_000 }), { maxLength: 30 }), fc.array(fc.integer({ min: 200, max: 30_000 }), { maxLength: 30 }), (pastRts, roundRts) => {
        const past = pastRts.map((rt, i) => attempt(i % 6, rt))
        const { headline } = compareWithPast(past, roundRts, NOW)
        expect(headline).not.toMatch(/\d|%|nota|punt|error|malament/i)
      }),
    )
  })
})
