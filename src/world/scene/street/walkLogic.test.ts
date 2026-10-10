import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { atDoor, cameraFor, followOffset, stepToward, streetXAt, walkBounds } from './walkLogic'

describe('walkLogic', () => {
  it('steps toward the target and arrives exactly', () => {
    expect(stepToward(0, 1000, 100).x).toBeCloseTo(36)
    expect(stepToward(990, 1000, 100)).toEqual({ x: 1000, arrived: true })
    expect(stepToward(500, 100, 50).x).toBeLessThan(500)
  })

  it('property: never overshoots', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 1, max: 100 }), (x, target, dt) => {
        const next = stepToward(x, target, dt)
        expect(Math.abs(next.x - target)).toBeLessThanOrEqual(Math.abs(x - target))
        if (!next.arrived) expect(Math.sign(target - next.x)).toBe(Math.sign(target - x))
      }),
    )
  })

  it('the camera eases in and never leaves the street', () => {
    expect(followOffset(0, -100, 16)).toBeLessThan(0)
    expect(followOffset(0, -100, 16)).toBeGreaterThan(-100)
    expect(cameraFor(100, 1, 400, -800)).toBe(0)
    expect(cameraFor(5000, 1, 400, -800)).toBe(-800)
    expect(cameraFor(600, 1, 400, -800)).toBe(-400)
  })

  it('maps taps to street positions and keeps her inside the street', () => {
    expect(streetXAt(300, 0, -100, 2)).toBe(200)
    expect(walkBounds(1000)).toEqual({ min: 60, max: 940 })
    expect(atDoor(500, 520, 300)).toBe(true)
    expect(atDoor(100, 520, 300)).toBe(false)
  })
})
