import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DEFAULT_STEPS, MAX_STEPS, MIN_STEPS, PER_ROW, mazeBranches, mazeLength, mazePathD, mazePoints, mazeProgress, pointAt } from './mazeLogic'

describe('mazeLength', () => {
  it('defaults to 8 questions and respects the host limit inside 4..10', () => {
    expect(mazeLength(undefined)).toBe(DEFAULT_STEPS)
    expect(DEFAULT_STEPS).toBeGreaterThanOrEqual(8)
    expect(mazeLength(6)).toBe(6)
    expect(mazeLength(1)).toBe(MIN_STEPS)
    expect(mazeLength(50)).toBe(MAX_STEPS)
    expect(mazeLength(9.7)).toBe(9)
  })
})

describe('mazePoints', () => {
  it('has one point per question plus the chest, all inside the drawing', () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_STEPS, max: MAX_STEPS }), fc.string(), (steps, seed) => {
        const points = mazePoints(steps, seed)
        expect(points).toHaveLength(steps + 1)
        for (const p of points) {
          expect(p.x).toBeGreaterThanOrEqual(5)
          expect(p.x).toBeLessThanOrEqual(95)
          expect(p.y).toBeGreaterThanOrEqual(0)
        }
      }),
    )
  })

  it('is deterministic for a seed and moves forward (down the page) row by row', () => {
    expect(mazePoints(8, 'a')).toEqual(mazePoints(8, 'a'))
    expect(mazePoints(8, 'a')).not.toEqual(mazePoints(8, 'b'))
    const points = mazePoints(9, 'rows')
    for (let i = PER_ROW; i < points.length; i++) expect(points[i]?.y ?? 0).toBeGreaterThan(points[i - PER_ROW]?.y ?? 0)
  })

  it('zig-zags: consecutive rows run in opposite directions', () => {
    const points = mazePoints(9, 'zig')
    expect(points[0]?.x ?? 0).toBeLessThan(points[PER_ROW - 1]?.x ?? 0)
    expect(points[PER_ROW]?.x ?? 0).toBeGreaterThan(points[2 * PER_ROW - 1]?.x ?? 0)
  })
})

describe('mazeBranches', () => {
  it('gives every junction a dead-end side path and none to the chest', () => {
    const points = mazePoints(8, 's')
    const branches = mazeBranches(points, 's')
    expect(branches).toHaveLength(8)
    branches.forEach((b, i) => {
      expect(b.from).toEqual(points[i])
      expect(b.to).not.toEqual(b.from)
    })
  })
})

describe('mazePathD and pointAt', () => {
  it('draws one move then one curve per step', () => {
    const d = mazePathD(mazePoints(8, 'p'))
    expect(d.startsWith('M ')).toBe(true)
    expect(d.match(/C /g)).toHaveLength(8)
  })

  it('stands on the last point once the maze is done and never beyond', () => {
    const points = mazePoints(8, 'q')
    expect(pointAt(points, 0)).toEqual(points[0])
    expect(pointAt(points, 3)).toEqual(points[3])
    expect(pointAt(points, 99)).toEqual(points[8])
    expect(pointAt(points, -2)).toEqual(points[0])
  })
})

describe('mazeProgress', () => {
  it('counts finished junctions and reports the end', () => {
    expect(mazeProgress(0, 8)).toEqual({ done: 0, remaining: 8, finished: false })
    expect(mazeProgress(5, 8)).toEqual({ done: 5, remaining: 3, finished: false })
    expect(mazeProgress(8, 8)).toEqual({ done: 8, remaining: 0, finished: true })
    expect(mazeProgress(12, 8)).toEqual({ done: 8, remaining: 0, finished: true })
    expect(mazeProgress(-1, 8).done).toBe(0)
  })
})
