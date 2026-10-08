import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DRIFT_MAX_MS, DRIFT_MIN_MS, classifyAnswer, driftDurationMs, paceMs, shouldCalmDown } from './pace'

const TARGET = 3000

describe('paceMs', () => {
  it('is generous for a fact without history', () => {
    expect(paceMs(undefined, TARGET)).toBe(TARGET * 2.5)
  })
  it('follows 90 % of the personal median and never goes below the fluent goal', () => {
    expect(paceMs(6000, TARGET)).toBe(5400)
    expect(paceMs(1000, TARGET)).toBe(TARGET * 1.5)
  })
  it('never exceeds the generous start', () => {
    expect(paceMs(60_000, TARGET)).toBe(TARGET * 2.5)
  })
  it('property: always between the goal and the start', () => {
    fc.assert(
      fc.property(fc.option(fc.integer({ min: 0, max: 120_000 }), { nil: undefined }), fc.integer({ min: 1000, max: 12_000 }), (median, target) => {
        const pace = paceMs(median, target)
        expect(pace).toBeGreaterThanOrEqual(target * 1.5)
        expect(pace).toBeLessThanOrEqual(target * 2.5)
      }),
    )
  })
})

describe('classifyAnswer', () => {
  it('is fast within the pace, steady within twice the pace, calm otherwise', () => {
    expect(classifyAnswer(4000, 5000)).toBe('fast')
    expect(classifyAnswer(8000, 5000)).toBe('steady')
    expect(classifyAnswer(30_000, 5000)).toBe('calm')
  })
})

describe('driftDurationMs', () => {
  it('starts generous for a new fact and shortens as the fact becomes fluent', () => {
    const fresh = driftDurationMs(paceMs(undefined, TARGET), 0)
    const fluent = driftDurationMs(paceMs(1500, TARGET), 0)
    expect(fresh).toBeGreaterThan(fluent)
  })
  it('lengthens after misses', () => {
    const pace = paceMs(4000, TARGET)
    expect(driftDurationMs(pace, 2)).toBeGreaterThan(driftDurationMs(pace, 0))
  })
  it('property: bounded, monotone in pace and in misses', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 60_000 }), fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 20_000 }), (pace, misses, extra) => {
        const d = driftDurationMs(pace, misses)
        expect(d).toBeGreaterThanOrEqual(DRIFT_MIN_MS)
        expect(d).toBeLessThanOrEqual(DRIFT_MAX_MS)
        expect(driftDurationMs(pace + extra, misses)).toBeGreaterThanOrEqual(d)
        expect(driftDurationMs(pace, misses + 1)).toBeGreaterThanOrEqual(d)
      }),
    )
  })
})

describe('shouldCalmDown', () => {
  it('stops the fish after three misses in a row', () => {
    expect(shouldCalmDown(2)).toBe(false)
    expect(shouldCalmDown(3)).toBe(true)
  })
})
