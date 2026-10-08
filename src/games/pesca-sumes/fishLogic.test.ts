import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CATCH_GOAL, MIN_CATCHES, catchEnded, catchProgress, layoutFish, leaveAfterMs, roundCap } from './fishLogic'

describe('layoutFish', () => {
  it('gives every fish its own lane and a growing delay', () => {
    const slots = layoutFish(4, 7)
    expect(new Set(slots.map((s) => s.lane)).size).toBe(4)
    slots.slice(1).forEach((s, i) => expect(s.delayMs).toBeGreaterThan(slots[i]?.delayMs ?? 0))
  })
  it('rotates the lanes with the serial', () => {
    expect(layoutFish(3, 0)[0]?.lane).not.toBe(layoutFish(3, 1)[0]?.lane)
  })
  it('property: lanes are distinct and delays bounded', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 0, max: 100 }), (count, serial) => {
        const slots = layoutFish(count, serial)
        expect(new Set(slots.map((s) => s.lane)).size).toBe(count)
        expect(Math.max(...slots.map((s) => s.delayMs))).toBeLessThanOrEqual(1800)
      }),
    )
  })
})

describe('leaveAfterMs', () => {
  it('is shorter than the swim plus the stagger, and never negative', () => {
    const slots = layoutFish(4, 0)
    expect(leaveAfterMs(10_000, slots)).toBeGreaterThan(9000)
    expect(leaveAfterMs(10_000, slots)).toBeLessThan(10_000 + 1800)
  })
})

describe('session length', () => {
  it('never ends before 8 catches, even when the host asks for fewer', () => {
    expect(roundCap(3)).toBe(MIN_CATCHES)
    expect(catchEnded(MIN_CATCHES - 1, 3)).toBe(false)
    expect(catchEnded(MIN_CATCHES, 3)).toBe(true)
  })
  it('defaults to the catch goal', () => {
    expect(roundCap(undefined)).toBe(CATCH_GOAL)
    expect(catchEnded(CATCH_GOAL - 1, undefined)).toBe(false)
    expect(catchEnded(CATCH_GOAL, undefined)).toBe(true)
  })
  it('progress stays within 0..1', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 60 }), (n) => {
        expect(catchProgress(n, undefined)).toBeLessThanOrEqual(1)
      }),
    )
  })
})
