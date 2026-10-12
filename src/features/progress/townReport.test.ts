import { describe, expect, it } from 'vitest'
import { newSkillState, type SkillState } from '../../core/engine/mastery'
import { PLACES } from '../../world/places/registry'
import { unlockHint } from '../../world/places/unlock'
import { newDayState, recordResolved, REQUEST_SECONDS } from '../../world/requests/dayState'
import { att, DAY, NOW } from './analytics/testData'
import { buildTownReport, type TownReportInput } from './townReport'

const base: TownReportInput = { places: PLACES, skillStates: {}, day: undefined, dailyMinutes: 12, petals: 0, petalsSpent: 0, attempts: [], now: NOW }
const started = (id: string): Record<string, SkillState> => ({ [id]: { ...newSkillState(id), status: 'aprenent', mastery: 0.3 } })

describe('buildTownReport', () => {
  it('lists every lot of the street: open ones plainly, closed ones with the plain-Catalan hint', () => {
    const { places } = buildTownReport(base)
    expect(places.map((p) => p.id)).toEqual(['casa', 'botiga', 'autobus', 'perruqueria', 'recreatius', 'fleca', 'granja', 'pizzeria', 'mercat'])
    const open = places.filter((p) => p.open)
    expect(open.length).toBeGreaterThan(0)
    expect(open.every((p) => p.hint === '')).toBe(true)
    const closed = places.filter((p) => !p.open)
    expect(closed.length).toBeGreaterThan(0)
    expect(closed.every((p) => p.hint.length > 0)).toBe(true)
    const closedBuilt = closed.find((p) => PLACES.some((m) => m.id === p.id))
    expect(closedBuilt?.hint).toBe(unlockHint(PLACES.find((m) => m.id === closedBuilt?.id)?.unlock))
    expect(places[0]?.name).toMatch(/^[A-ZÀ-Ý]/)
  })

  it('opens more places when the child has started an operation', () => {
    const before = buildTownReport(base).places.filter((p) => p.open).length
    const after = buildTownReport({ ...base, skillStates: started('A4') }).places.filter((p) => p.open).length
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('before the town is opened today it shows the target from the setting', () => {
    const { today } = buildTownReport({ ...base, dailyMinutes: 20 })
    expect(today).toMatchObject({ started: false, done: 0, minutes: 0, targetMinutes: 20, complete: false })
    expect(today.target).toBeGreaterThan(buildTownReport(base).today.target)
  })

  it('reads requests done over the allotment and the approximate minutes from today’s state', () => {
    let day = newDayState('2026-10-07', [{ place: 'botiga', count: 4, kind: 'repte', neighbour: 'senyora-pilar' }])
    for (let i = 0; i < 2; i++) day = recordResolved(day, 'botiga', true, i)
    const { today } = buildTownReport({ ...base, day })
    expect(today).toMatchObject({ started: true, done: 2, target: 4, minutes: Math.round((2 * REQUEST_SECONDS) / 60), targetMinutes: Math.round((4 * REQUEST_SECONDS) / 60), complete: false })
    for (let i = 0; i < 2; i++) day = recordResolved(day, 'botiga', true, 5 + i)
    expect(buildTownReport({ ...base, day }).today.complete).toBe(true)
  })

  it('counts coins earned, spent and left (never negative)', () => {
    expect(buildTownReport({ ...base, petals: 50, petalsSpent: 20 }).coins).toEqual({ earned: 50, spent: 20, balance: 30 })
    expect(buildTownReport({ ...base, petals: 5, petalsSpent: 9 }).coins.balance).toBe(0)
  })

  it('counts correct town answers of the last 7 days and visits per place over 14 days', () => {
    const attempts = [
      att(NOW - DAY, { gameId: 'poble-botiga' }),
      att(NOW - 2 * DAY, { gameId: 'poble-botiga', correct: false }),
      att(NOW - 6 * DAY, { gameId: 'poble-casa' }),
      att(NOW - 10 * DAY, { gameId: 'poble-casa' }),
      att(NOW - 10 * DAY, { gameId: 'poble-casa' }),
      att(NOW - 20 * DAY, { gameId: 'poble-casa' }),
      att(NOW - DAY, { gameId: 'marc-magic' }),
    ]
    const report = buildTownReport({ ...base, attempts })
    expect(report.solvedThisWeek).toBe(2)
    expect(report.visits.map((v) => [v.id, v.answers])).toEqual([
      ['casa', 3],
      ['botiga', 2],
    ])
  })

  it('has no visits and no solved requests without history', () => {
    const report = buildTownReport(base)
    expect(report.visits).toEqual([])
    expect(report.solvedThisWeek).toBe(0)
  })
})
