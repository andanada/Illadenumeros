import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { glideDistance, glideStep, MAX_SPEED, offsetToCentre, pushSample, releaseVelocity, restingOffset, rubberBand } from './inertia'

describe('inertia', () => {
  it('measures the release velocity over the recent samples only', () => {
    const samples = [0, 20, 40, 60, 200].reduce<{ x: number; t: number }[]>((acc, t, i) => pushSample(acc, { x: i * 10, t }), [])
    expect(samples).toHaveLength(1)
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 50, t: 50 }])).toBe(1)
    expect(releaseVelocity([{ x: 0, t: 0 }])).toBe(0)
    expect(releaseVelocity([])).toBe(0)
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 10_000, t: 1 }])).toBe(MAX_SPEED)
  })

  it('a slow release does not glide; a fling glides in its direction', () => {
    expect(glideDistance(0.01)).toBe(0)
    expect(glideDistance(1)).toBeGreaterThan(0)
    expect(glideDistance(-1)).toBeLessThan(0)
  })

  it('stops at the edges', () => {
    expect(restingOffset(0, 4, -1000, 0)).toBe(0)
    expect(restingOffset(-500, -4, -1000, 0)).toBe(-1000)
    expect(glideStep(-5, 3, 16, -1000, 0)).toEqual({ offset: 0, velocity: 0 })
  })

  it('property: stepping the glide converges near the projected resting offset', () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 3, noNaN: true }), fc.integer({ min: -2000, max: 0 }), (v, start) => {
        let state = { offset: start, velocity: v }
        for (let i = 0; i < 2000 && state.velocity !== 0; i++) state = glideStep(state.offset, state.velocity, 1, -2000, 0)
        expect(state.offset).toBeGreaterThanOrEqual(-2000)
        expect(state.offset).toBeLessThanOrEqual(0)
        expect(Math.abs(state.offset - restingOffset(start, v, -2000, 0))).toBeLessThan(15)
      }),
    )
  })

  it('rubber band: follows a little past the edge, never more than the limit', () => {
    expect(rubberBand(-50, -100, 0)).toBe(-50)
    expect(rubberBand(40, -100, 0)).toBeGreaterThan(0)
    expect(rubberBand(10_000, -100, 0)).toBeLessThan(80)
    expect(rubberBand(-10_000, -100, 0)).toBeGreaterThan(-180)
  })

  it('centres a building inside the bounds', () => {
    expect(offsetToCentre(1000, 400, -1600, 0)).toBe(-800)
    expect(offsetToCentre(50, 400, -1600, 0)).toBe(0)
  })
})
