import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../../ambits/mates/skills'
import type { Attempt } from '../../../core/progress/applyAnswer'
import { buildProgressReport } from './report'
import { att, batch, DAY, NOW } from './testData'

const base = { skills: MATES_SKILLS, skillStates: {}, factStates: {}, daysPlayed: [] as string[] }

function checkFinite(value: unknown, path = 'report'): void {
  if (typeof value === 'number') expect(Number.isFinite(value), path).toBe(true)
  else if (value instanceof Set) return
  else if (Array.isArray(value)) value.forEach((v, i) => checkFinite(v, `${path}[${i}]`))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => checkFinite(v, `${path}.${k}`))
}

describe('buildProgressReport', () => {
  it('works with an empty history and has no NaN or Infinity', () => {
    const report = buildProgressReport({ ...base, attempts: [] }, NOW)
    expect(report.hasData).toBe(false)
    expect(report.summary.totalMinutes).toBe(0)
    expect(report.summary.streak).toBe(0)
    expect(report.activity).toHaveLength(28)
    expect(report.recommendations).toEqual([])
    expect(report.misconceptions).toEqual([])
    expect(report.skillGroups.map((g) => g.label)).toEqual(['1r', '2n', '3r', '4t'])
    checkFinite(report)
  })

  it('works with a single attempt', () => {
    const report = buildProgressReport({ ...base, attempts: [att(NOW - 1000)] }, NOW)
    expect(report.hasData).toBe(true)
    expect(report.summary.streak).toBe(1)
    expect(report.summary.daysThisWeek).toBe(1)
    checkFinite(report)
  })

  it('merges the days of the rewards with the days found in the attempts', () => {
    const report = buildProgressReport({ ...base, daysPlayed: ['2026-10-06', '2026-10-05'], attempts: batch(0, 3) }, NOW)
    expect(report.summary.streak).toBe(3)
  })

  it('tolerates garbage attempts (negative times, NaN, clock going back)', () => {
    const attempts: Attempt[] = [att(NOW - DAY, { rtMs: -4 }), att(Number.NaN), att(NOW - 2 * DAY, { rtMs: Number.POSITIVE_INFINITY }), att(NOW - 5)]
    checkFinite(buildProgressReport({ ...base, attempts }, NOW))
  })

  it('aggregates 100 000 attempts quickly', () => {
    const attempts: Attempt[] = []
    for (let i = 0; i < 100_000; i++) {
      attempts.push(att(NOW - Math.floor((i / 100_000) * 90 * DAY) + (i % 50) * 3000, { correct: i % 4 !== 0, rtMs: 1500 + (i % 7) * 500, skillId: i % 3 === 0 ? 'A4' : 'D3', misconception: i % 4 === 0 ? 'adjacent-fact' : undefined }))
    }
    const started = performance.now()
    const report = buildProgressReport({ ...base, attempts }, NOW)
    const elapsed = performance.now() - started
    expect(report.hasData).toBe(true)
    expect(elapsed).toBeLessThan(3000)
    checkFinite(report)
  })
})
