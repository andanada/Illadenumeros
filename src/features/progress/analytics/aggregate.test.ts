import { describe, expect, it } from 'vitest'
import { aggregateAttempts } from './aggregate'
import { att, batch, DAY, NOW } from './testData'

const target = () => 3000

describe('aggregateAttempts', () => {
  it('handles an empty history without NaN', () => {
    const agg = aggregateAttempts([], NOW, target)
    expect(agg.last7.attempts).toBe(0)
    expect(agg.last7.accuracy).toBeUndefined()
    expect(agg.last7.fluency).toBeUndefined()
    expect(agg.weeks).toHaveLength(4)
    expect(agg.weeks.every((w) => w.accuracy === undefined && w.medianRtMs === undefined && !w.enough)).toBe(true)
    expect(agg.lastPlayedAt).toBeUndefined()
    expect(agg.totalAttempts).toBe(0)
  })

  it('compares the last 7 days with the previous 7', () => {
    const attempts = [...batch(1, 10, (i) => ({ correct: i < 8 })), ...batch(9, 10, (i) => ({ correct: i < 5 }))]
    const agg = aggregateAttempts(attempts, NOW, target)
    expect(agg.last7.accuracy).toBeCloseTo(0.8)
    expect(agg.prev7.accuracy).toBeCloseTo(0.5)
  })

  it('counts fluent answers: correct, no hints and within 1.5x the skill target', () => {
    const attempts = [
      ...batch(0, 1, { rtMs: 4400 }),
      ...batch(0, 1, { rtMs: 4600 }),
      ...batch(0, 1, { rtMs: 1000, hintsUsed: 1 }),
      ...batch(0, 1, { rtMs: 1000, correct: false }),
    ]
    const agg = aggregateAttempts(attempts, NOW, target)
    expect(agg.last7.fluent).toBe(1)
    expect(agg.last7.fluency).toBeCloseTo(0.25)
  })

  it('buckets 4 weeks, oldest first, and takes the median of correct answers only', () => {
    const attempts = [
      ...batch(0, 10, (i) => ({ rtMs: (i + 1) * 1000 })),
      ...batch(0, 3, { correct: false, rtMs: 90_000 }),
      ...batch(8, 10),
      ...batch(30, 10),
    ]
    const { weeks } = aggregateAttempts(attempts, NOW, target)
    expect(weeks[3]?.attempts).toBe(13)
    expect(weeks[3]?.medianRtMs).toBe(5500)
    expect(weeks[3]?.enough).toBe(true)
    expect(weeks[2]?.attempts).toBe(10)
    expect(weeks[0]?.attempts).toBe(0)
  })

  it('marks a week with fewer than 10 attempts as not enough data', () => {
    const { weeks } = aggregateAttempts(batch(2, 9), NOW, target)
    expect(weeks[3]?.enough).toBe(false)
  })

  it('ignores negative response times for the median and the future', () => {
    const attempts = [...batch(0, 10, { rtMs: -50 }), att(NOW + 5 * DAY)]
    const agg = aggregateAttempts(attempts, NOW, target)
    expect(agg.weeks[3]?.medianRtMs).toBeUndefined()
    expect(agg.last7.attempts).toBe(10)
    expect(agg.lastPlayedAt).toBeLessThanOrEqual(NOW)
  })

  it('counts misconceptions of the last 30 days from wrong answers only', () => {
    const attempts = [
      ...batch(2, 3, { correct: false, misconception: 'adjacent-fact' }),
      ...batch(5, 1, { correct: false, misconception: 'off-by-one' }),
      ...batch(40, 4, { correct: false, misconception: 'no-carry' }),
      ...batch(1, 2, { correct: true, misconception: 'off-by-one' }),
    ]
    const { misconceptions } = aggregateAttempts(attempts, NOW, target)
    expect(misconceptions).toEqual({ 'adjacent-fact': 3, 'off-by-one': 1 })
  })

  it('records the days played and the last attempt', () => {
    const attempts = [...batch(0, 2), ...batch(3, 1)]
    const agg = aggregateAttempts(attempts, NOW, target)
    expect(agg.playedDays.size).toBe(2)
    expect(agg.lastPlayedAt).toBe(attempts[1]?.createdAt)
  })

  it('splits each skill between the older and the recent week of the last 14 days', () => {
    const attempts = [...batch(10, 10, (i) => ({ skillId: 'B1', correct: i < 3 })), ...batch(1, 10, (i) => ({ skillId: 'B1', correct: i < 4 }))]
    const b1 = aggregateAttempts(attempts, NOW, target).skills['B1']
    expect(b1).toEqual({ olderAttempts: 10, olderCorrect: 3, recentAttempts: 10, recentCorrect: 4 })
  })
})
