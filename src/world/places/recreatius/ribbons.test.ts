import { describe, expect, it } from 'vitest'
import type { PastAttempt } from '../../../games/shared/speed/personalBest'
import { dayMedians, ribbonFor, ribbonsOf } from './ribbons'

const DAY = 24 * 60 * 60 * 1000
const NOON = new Date(2026, 9, 9, 12).getTime()

const day = (ago: number, rt: number, gameId = 'tren-sumes', extra: Partial<PastAttempt> = {}): PastAttempt[] =>
  Array.from({ length: 4 }, (_, i) => ({ gameId, correct: true, hintsUsed: 0, rtMs: rt + i, createdAt: NOON - ago * DAY + i, ...extra }))

describe('ribbons: only the child against her own past', () => {
  it('no play, no ribbon', () => {
    expect(ribbonFor([], 'tren-sumes').tier).toBe(0)
    expect(ribbonsOf([]).map((r) => r.tier)).toEqual([0, 0, 0])
  })

  it('one day: «Ja tens el ritme»', () => {
    expect(ribbonFor(day(0, 3000), 'tren-sumes')).toMatchObject({ tier: 1, label: 'Ja tens el ritme' })
  })

  it('faster than the day before: tier 2; best of three days or more: record', () => {
    expect(ribbonFor([...day(1, 4000), ...day(0, 3000)], 'tren-sumes').tier).toBe(2)
    expect(ribbonFor([...day(2, 5000), ...day(1, 4000), ...day(0, 3000)], 'tren-sumes')).toMatchObject({
      tier: 3,
      label: 'Rècord personal',
    })
  })

  it('slower than before is not a failure: the rhythm ribbon stays', () => {
    expect(ribbonFor([...day(1, 3000), ...day(0, 4000)], 'tren-sumes').tier).toBe(1)
  })

  it('answers with help, wrong ones and other games never count', () => {
    const noise = [
      ...day(0, 1000, 'tren-sumes', { hintsUsed: 1 }),
      ...day(0, 1000, 'tren-sumes', { correct: false }),
      ...day(0, 1000, 'pesca-sumes'),
    ]
    expect(dayMedians(noise, 'tren-sumes')).toEqual([])
    expect(ribbonFor([...day(1, 4000), ...day(0, 3000), ...noise], 'tren-sumes').tier).toBe(2)
  })

  it('needs at least 3 answers in a day', () => {
    expect(dayMedians(day(0, 3000).slice(0, 2), 'tren-sumes')).toEqual([])
  })
})
