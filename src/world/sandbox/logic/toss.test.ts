import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { launch, simulateToss, type TossBounds } from './toss'

const BOUNDS: TossBounds = { floor: 0.9, minX: 0.05, maxX: 0.95 }

describe('toss', () => {
  it('always launches upwards', () => {
    expect(launch({ x: 0.5, y: 0.8 }, { vx: 0.2, vy: 0.5 }).vy).toBeLessThan(0)
  })

  it('lands on the floor and rests after a few bounces', () => {
    const { final, steps } = simulateToss(launch({ x: 0.3, y: 0.8 }, { vx: 0.5, vy: -1 }), BOUNDS)
    expect(final.resting).toBe(true)
    expect(final.y).toBe(BOUNDS.floor)
    expect(final.bounces).toBeGreaterThan(0)
    expect(steps).toBeLessThan(600)
  })

  it('property: stays inside the room and always comes to rest', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        (x, vx, vy) => {
          const { final } = simulateToss(launch({ x, y: 0.85 }, { vx, vy }), BOUNDS)
          expect(final.resting).toBe(true)
          expect(final.x).toBeGreaterThanOrEqual(BOUNDS.minX)
          expect(final.x).toBeLessThanOrEqual(BOUNDS.maxX)
        },
      ),
    )
  })
})
