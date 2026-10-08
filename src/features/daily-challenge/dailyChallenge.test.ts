import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays, challengeFor, CHALLENGE_GAMES, dailyStickerFor, dayKey, goalReached, recentCalendar, streakOf } from './dailyChallenge'

describe('dayKey (injected clock, fixed time zone)', () => {
  const instant = Date.UTC(2026, 9, 8, 23, 30) // 2026-10-08 23:30 UTC

  it('flips at local midnight of the given zone', () => {
    expect(dayKey(instant, 'UTC')).toBe('2026-10-08')
    expect(dayKey(instant, 'Europe/Madrid')).toBe('2026-10-09')
    expect(dayKey(instant, 'America/Los_Angeles')).toBe('2026-10-08')
  })

  it('addDays crosses months, years and daylight-saving changes', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('challengeFor', () => {
  it('is deterministic from the date', () => {
    expect(challengeFor('2026-10-08')).toEqual(challengeFor('2026-10-08'))
  })

  it('varies over the days and always offers a real game with a fair goal', () => {
    const games = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const c = challengeFor(addDays('2026-10-01', i))
      expect(c).toBeDefined()
      if (!c) continue
      games.add(c.gameId)
      expect(CHALLENGE_GAMES).toContain(c.gameId)
      expect(c.goal.target).toBeLessThan(c.goal.of)
      expect(c.goal.target / c.goal.of).toBeGreaterThanOrEqual(0.75)
    }
    expect(games.size).toBeGreaterThan(5)
  })

  it('skips games the child cannot open and gives up when none is open', () => {
    const only = challengeFor('2026-10-08', (id) => id === 'tren-sumes')
    expect(only?.gameId).toBe('tren-sumes')
    expect(challengeFor('2026-10-08', () => false)).toBeUndefined()
  })

  it('rejects a malformed day', () => {
    expect(challengeFor('hoy')).toBeUndefined()
  })

  it('the escape room uses its five doors', () => {
    expect(challengeFor('2026-10-08', (id) => id === 'escape-room')?.goal).toEqual({ of: 5, target: 4 })
  })

  it('goal reached means target or more right', () => {
    expect(goalReached({ of: 10, target: 8 }, 8)).toBe(true)
    expect(goalReached({ of: 10, target: 8 }, 7)).toBe(false)
  })
})

describe('daily sticker', () => {
  it('is a new sticker of the daily series, stable for the day, none when all are owned', () => {
    const first = dailyStickerFor('2026-10-08', [])
    expect(first).toMatch(/^d-/)
    expect(dailyStickerFor('2026-10-08', [])).toBe(first)
    expect(dailyStickerFor('2026-10-08', first ? [first] : [])).not.toBe(first)
    const all = Array.from({ length: 12 }, (_, i) => dailyStickerFor('x', []) ?? String(i))
    expect(all.length).toBe(12)
  })
})

describe('streak (never punishing)', () => {
  const set = (...days: string[]): ReadonlySet<string> => new Set(days)

  it('counts consecutive days; today pending does not break it', () => {
    expect(streakOf(set('2026-10-06', '2026-10-07'), '2026-10-08')).toBe(2)
    expect(streakOf(set('2026-10-06', '2026-10-07', '2026-10-08'), '2026-10-08')).toBe(3)
  })

  it('bridges one missed day but not two', () => {
    expect(streakOf(set('2026-10-05', '2026-10-07', '2026-10-08'), '2026-10-08')).toBe(3)
    expect(streakOf(set('2026-10-04', '2026-10-07', '2026-10-08'), '2026-10-08')).toBe(2)
  })

  it('starts fresh with nothing done', () => {
    expect(streakOf(set(), '2026-10-08')).toBe(0)
    expect(streakOf(set('2026-09-01'), '2026-10-08')).toBe(0)
  })

  it('is never negative nor above the days played (property)', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 40 }), { maxLength: 30 }), (offsets) => {
        const days = offsets.map((o) => addDays('2026-09-01', o))
        const n = streakOf(new Set(days), '2026-10-08')
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(days.length)
      }),
    )
  })

  it('the calendar ends today, oldest first', () => {
    const cal = recentCalendar(set('2026-10-08'), '2026-10-08', 7)
    expect(cal).toHaveLength(7)
    expect(cal[0]?.day).toBe('2026-10-02')
    expect(cal[6]).toEqual({ day: '2026-10-08', done: true, today: true })
  })
})
