import { describe, expect, it } from 'vitest'
import { dailyActivity, deriveSessions, MAX_DAY_MINUTES, MAX_SESSION_MINUTES } from './sessions'
import { dayKey } from './time'
import { att, MIN, NOW } from './testData'



describe('deriveSessions', () => {
  it('returns nothing without attempts', () => {
    expect(deriveSessions([])).toEqual([])
  })

  it('splits sessions on gaps longer than 10 minutes', () => {
    const t = NOW - 3 * 60 * MIN
    const sessions = deriveSessions([att(t), att(t + 2 * MIN), att(t + 12 * MIN), att(t + 30 * MIN)])
    expect(sessions.map((s) => s.answers)).toEqual([3, 1])
  })

  it('keeps a 10 minute gap inside the same session', () => {
    const t = NOW - 60 * MIN
    expect(deriveSessions([att(t), att(t + 10 * MIN)])).toHaveLength(1)
  })

  it('counts at least the thinking time of a single answer', () => {
    const [s] = deriveSessions([att(NOW, { rtMs: 6000 })])
    expect(s?.minutes).toBeCloseTo(0.1, 5)
  })

  it('caps a session at 20 minutes', () => {
    const t = NOW - 5 * 60 * MIN
    const many = Array.from({ length: 40 }, (_, i) => att(t + i * 2 * MIN))
    const [s] = deriveSessions(many)
    expect(s?.minutes).toBe(MAX_SESSION_MINUTES)
  })

  it('sorts attempts recorded out of order (clock changes) and ignores invalid times', () => {
    const t = NOW - 60 * MIN
    const sessions = deriveSessions([att(t + MIN), att(t), att(Number.NaN), att(-5, { rtMs: -3 })])
    expect(sessions.some((s) => !Number.isFinite(s.minutes) || s.minutes < 0)).toBe(false)
    expect(sessions.reduce((n, s) => n + s.answers, 0)).toBe(2)
  })

  it('treats negative response times as zero', () => {
    const [s] = deriveSessions([att(NOW, { rtMs: -5000 })])
    expect(s?.minutes).toBe(0)
  })
})

describe('dailyActivity', () => {
  it('returns 28 zero days for an empty history', () => {
    const days = dailyActivity([], NOW)
    expect(days).toHaveLength(28)
    expect(days.every((d) => d.minutes === 0 && d.answers === 0)).toBe(true)
    expect(days[27]?.day).toBe(dayKey(NOW))
  })

  it('adds answers and minutes to the day of the session start', () => {
    const t = NOW - 60 * MIN
    const days = dailyActivity([att(t), att(t + 4 * MIN)], NOW)
    const today = days[27]
    expect(today?.answers).toBe(2)
    expect(today?.minutes).toBeGreaterThan(3.9)
  })

  it('ignores attempts older than 28 days and in the future', () => {
    const days = dailyActivity([att(NOW - 40 * 24 * 60 * MIN), att(NOW + 3 * 24 * 60 * MIN)], NOW)
    expect(days.reduce((n, d) => n + d.answers, 0)).toBe(0)
  })

  it('never exceeds 12 hours a day', () => {
    const base = new Date(2026, 9, 7, 0, 5).getTime()
    // 30 separate sessions of 20 minutes = 10 h... use 50 sessions to exceed 12 h
    const list = Array.from({ length: 50 }, (_, i) => [att(base + i * 25 * MIN), att(base + i * 25 * MIN + 19 * MIN)]).flat()
    const today = dailyActivity(list, new Date(2026, 9, 7, 23, 59).getTime())[27]
    expect(today?.minutes).toBeLessThanOrEqual(MAX_DAY_MINUTES)
  })
})
