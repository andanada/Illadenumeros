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

const ok = (state: ReturnType<typeof newFactState>, now: number, rtMs = 1500) => updateFact(state, { correct: true, rtMs, targetMs: TARGET, now })

describe('leitner spacing: a box is only earned by spaced successes', () => {
  it('a same-day repeat after the first success does not move the box nor the due date', () => {
    const first = ok(newFactState('add:3+5', NOW), NOW)
    expect(first.box).toBe(1)
    let fact = first
    for (let i = 1; i <= 6; i++) fact = ok(fact, NOW + i * 60_000)
    expect(fact.box).toBe(1)
    expect(fact.dueAt).toBe(first.dueAt)
    expect(fact.correct).toBe(7)
  })

  it('follows the 1, 2, 4, 9, 21 day schedule: boxes 1..5 on days 0, 1, 3, 7 and 16', () => {
    const days = [0, 1, 3, 7, 16]
    let fact = newFactState('add:3+5', NOW)
    const boxes = days.map((d) => {
      fact = ok(fact, NOW + d * DAY)
      return fact.box
    })
    expect(boxes).toEqual([1, 2, 3, 4, 5])
  })

  it('a success before the review is due does not promote', () => {
    const start = ok(ok(newFactState('add:3+5', NOW), NOW), NOW + DAY)
    expect(start.box).toBe(2)
    const early = ok(start, NOW + DAY + 3_600_000)
    expect(early.box).toBe(2)
    expect(early.dueAt).toBe(start.dueAt)
  })

  it('after an error the fact lands in box 1 and an immediate success does not promote it again', () => {
    const high = { ...newFactState('add:3+5', NOW), box: 4, attempts: 9, dueAt: NOW }
    const failed = updateFact(high, { correct: false, rtMs: 2000, targetMs: TARGET, now: NOW })
    expect(failed.box).toBe(1)
    const retried = ok(failed, NOW + 40_000)
    expect(retried.box).toBe(1)
    expect(retried.dueAt).toBe(NOW + 40_000 + DAY)
    expect(ok(retried, NOW + 40_000 + DAY).box).toBe(2)
  })

  it('a new fact that failed first can still earn box 1 in the same session', () => {
    const failed = updateFact(newFactState('add:3+5', NOW), { correct: false, rtMs: 2000, targetMs: TARGET, now: NOW })
    expect(failed.box).toBe(0)
    expect(ok(failed, NOW + 40_000).box).toBe(1)
  })

  it('a slow success when due keeps the box and reschedules it', () => {
    const start = { ...newFactState('add:3+5', NOW), box: 3, attempts: 4, dueAt: NOW }
    const slow = ok(start, NOW + 10, 9000)
    expect(slow.box).toBe(3)
    expect(slow.dueAt).toBe(NOW + 10 + 4 * DAY)
  })

  it('legacy states that already sit in a high box keep working', () => {
    const legacy = { ...newFactState('add:3+5', NOW), box: 5, attempts: 12, correct: 12, streak: 12, dueAt: NOW + 5 * DAY, lastSeen: NOW - DAY }
    const same = ok(legacy, NOW)
    expect(same.box).toBe(5)
    expect(same.dueAt).toBe(legacy.dueAt)
  })
})
