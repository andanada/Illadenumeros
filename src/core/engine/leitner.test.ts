import { describe, expect, it } from 'vitest'
import { BOX_INTERVAL_DAYS, isDue, isFluent, medianRt, newFactState, updateFact } from './leitner'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_700_000_000_000
const TARGET = 3000

describe('leitner', () => {
  it('a new fact starts in box 0 and is due immediately', () => {
    const fact = newFactState('add:3+5', NOW)
    expect(fact.box).toBe(0)
    expect(isDue(fact, NOW)).toBe(true)
  })

  it('a fast correct answer moves the fact up one box and schedules it', () => {
    const fact = updateFact(newFactState('add:3+5', NOW), { correct: true, rtMs: 1500, targetMs: TARGET, now: NOW })
    expect(fact.box).toBe(1)
    expect(fact.dueAt).toBe(NOW + (BOX_INTERVAL_DAYS[1] ?? 0) * DAY)
    expect(fact.correct).toBe(1)
    expect(fact.attempts).toBe(1)
  })

  it('a slow correct answer keeps the box (accurate but not fluent yet)', () => {
    const start = { ...newFactState('add:3+5', NOW), box: 2 }
    const fact = updateFact(start, { correct: true, rtMs: 9000, targetMs: TARGET, now: NOW })
    expect(fact.box).toBe(2)
  })

  it('an error drops the fact to box 1 and makes it due again soon', () => {
    const start = { ...newFactState('add:3+5', NOW), box: 4 }
    const fact = updateFact(start, { correct: false, rtMs: 2000, targetMs: TARGET, now: NOW })
    expect(fact.box).toBe(1)
    expect(fact.streak).toBe(0)
    expect(isDue(fact, NOW + 60_000)).toBe(true)
  })

  it('never goes above box 5', () => {
    const start = { ...newFactState('add:3+5', NOW), box: 5 }
    const fact = updateFact(start, { correct: true, rtMs: 500, targetMs: TARGET, now: NOW })
    expect(fact.box).toBe(5)
  })

  it('does not mutate the previous state', () => {
    const start = newFactState('add:3+5', NOW)
    const snapshot = JSON.stringify(start)
    updateFact(start, { correct: true, rtMs: 500, targetMs: TARGET, now: NOW })
    expect(JSON.stringify(start)).toBe(snapshot)
  })

  it('keeps only the last 5 correct response times and computes the median', () => {
    let fact = newFactState('add:3+5', NOW)
    for (const rt of [1000, 2000, 3000, 4000, 5000, 6000]) {
      fact = updateFact(fact, { correct: true, rtMs: rt, targetMs: TARGET, now: NOW })
    }
    expect(fact.recentRts).toEqual([2000, 3000, 4000, 5000, 6000])
    expect(medianRt(fact)).toBe(4000)
  })

  it('is fluent only in box >= 3 with a median under the target', () => {
    const base = newFactState('add:3+5', NOW)
    expect(isFluent({ ...base, box: 3, recentRts: [1000, 1200, 1500] }, TARGET)).toBe(true)
    expect(isFluent({ ...base, box: 2, recentRts: [1000, 1200, 1500] }, TARGET)).toBe(false)
    expect(isFluent({ ...base, box: 4, recentRts: [8000, 9000, 9500] }, TARGET)).toBe(false)
  })
})
