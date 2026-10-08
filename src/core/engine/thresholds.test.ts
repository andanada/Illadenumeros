import { describe, expect, it } from 'vitest'
import { BOX_INTERVAL_DAYS, MASTERY_THRESHOLDS as T, strictTargetFor } from './thresholds'

describe('mastery thresholds table', () => {
  it('keeps the documented values', () => {
    expect(BOX_INTERVAL_DAYS).toEqual([0, 1, 2, 4, 9, 21])
    expect(T.skill).toMatchObject({ masteredAt: 0.85, keepMasteredAbove: 0.65, minAttempts: 20, minSessions: 2, unlockAt: 0.6 })
    expect(T.core).toMatchObject({ factMinBox: 4, gainShare: 0.9, keepShare: 0.75, minCleanDays: 3 })
    expect(T.core.strictFluentMs).toEqual({ addSub: 3000, mulDiv: 4000 })
    expect(T.leitner.fluencyLeniency).toBe(1.5)
    expect(T.session.maxFactsInFlight).toBe(3)
    expect(T.mission).toMatchObject({ minutes: 12, coreShare: 0.5, warmupMinBox: 2, softenBelow: 0.7, softenWindow: 10 })
  })

  it('has hysteresis everywhere: keeping is easier than gaining', () => {
    expect(T.skill.keepMasteredAbove).toBeLessThan(T.skill.masteredAt)
    expect(T.core.keepShare).toBeLessThan(T.core.gainShare)
    expect(T.skill.consolidatingAt).toBeLessThan(T.skill.keepMasteredAbove)
  })

  it('has strictly increasing review intervals and a box reachable by spaced successes', () => {
    for (let i = 1; i < BOX_INTERVAL_DAYS.length; i++) expect(BOX_INTERVAL_DAYS[i]).toBeGreaterThan(BOX_INTERVAL_DAYS[i - 1] as number)
    expect(T.core.factMinBox).toBeLessThan(BOX_INTERVAL_DAYS.length)
    expect(T.core.minCleanDays).toBeLessThanOrEqual(T.core.factMinBox)
  })

  it('scales the strict response time by operation', () => {
    expect(strictTargetFor('add')).toBe(3000)
    expect(strictTargetFor('sub')).toBe(3000)
    expect(strictTargetFor('mul')).toBe(4000)
    expect(strictTargetFor('div')).toBe(4000)
  })

  it('keeps the family gap and mission shares sensible', () => {
    expect(T.session.familyGapMin).toBeGreaterThanOrEqual(2)
    expect(T.session.familyGapMax).toBeGreaterThanOrEqual(T.session.familyGapMin)
    expect(T.mission.coreShare).toBeGreaterThanOrEqual(0.5)
  })
})
