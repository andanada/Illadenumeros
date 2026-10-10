import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isFree } from './pathfind'
import { cellOf, floorGrid, planWalk, snapToFloor } from './walkPlan'

const SOFA = { x: 0.4, y: 0.5, w: 0.2, h: 0.5 }

describe('walkPlan', () => {
  it('ends exactly at the tapped floor spot', () => {
    const grid = floorGrid([], 0.4)
    const plan = planWalk(grid, { x: 0.1, y: 0.8 }, { x: 0.9, y: 0.7 })
    expect(plan[plan.length - 1]).toEqual({ x: 0.9, y: 0.7 })
  })

  it('goes around furniture instead of through it', () => {
    const grid = floorGrid([{ ...SOFA, y: 0.4, h: 0.45 }], 0.4)
    const plan = planWalk(grid, { x: 0.1, y: 0.7 }, { x: 0.9, y: 0.7 })
    expect(plan.length).toBeGreaterThan(1)
    for (const p of plan.slice(0, -1)) expect(isFree(grid, cellOf(p))).toBe(true)
  })

  it('a tap on the wall or on furniture lands on the nearest floor', () => {
    const grid = floorGrid([SOFA], 0.4)
    const onWall = snapToFloor(grid, { x: 0.2, y: 0.1 })
    expect(onWall.y).toBeGreaterThanOrEqual(0.4)
    const onSofa = planWalk(grid, { x: 0.1, y: 0.8 }, { x: 0.5, y: 0.7 })
    expect(onSofa.length).toBeGreaterThan(0)
  })

  it('property: waypoints stay on the floor', () => {
    const grid = floorGrid([SOFA], 0.4)
    const pt = fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0.4, max: 1, noNaN: true }) })
    fc.assert(
      fc.property(pt, pt, (a, b) => {
        for (const p of planWalk(grid, a, b)) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(1)
          expect(p.y).toBeGreaterThanOrEqual(0.39)
        }
      }),
    )
  })
})
