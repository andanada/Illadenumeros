import { describe, expect, it } from 'vitest'
import { barRects, lineSegments, niceMax } from './chart'

describe('niceMax', () => {
  it('never returns 0 or a non finite number', () => {
    expect(niceMax([])).toBeGreaterThan(0)
    expect(niceMax([0, 0])).toBeGreaterThan(0)
    expect(niceMax([Number.NaN, -3])).toBeGreaterThan(0)
  })
  it('rounds up to a readable value', () => {
    expect(niceMax([7, 12])).toBe(15)
    expect(niceMax([42])).toBe(50)
  })
})

describe('barRects', () => {
  it('scales bars to the height and keeps zero bars at zero height', () => {
    const rects = barRects([0, 5, 10], { width: 90, height: 100 }, 10)
    expect(rects.map((r) => r.height)).toEqual([0, 50, 100])
    expect(rects[2]?.y).toBe(0)
    expect(rects.every((r) => r.x >= 0 && r.x + r.width <= 90)).toBe(true)
  })
  it('returns no bars for no data', () => {
    expect(barRects([], { width: 90, height: 100 }, 10)).toEqual([])
  })
})

describe('lineSegments', () => {
  const size = { width: 300, height: 100 }
  it('splits the line at missing values and keeps lone points', () => {
    const { segments, points } = lineSegments([10, 20, undefined, 30, undefined], size, 0, 40)
    expect(segments.map((s) => s.length)).toEqual([2, 1])
    expect(points).toHaveLength(3)
  })
  it('puts the maximum at the top and the minimum at the bottom', () => {
    const { points } = lineSegments([0, 40], size, 0, 40)
    expect(points[0]?.y).toBe(100)
    expect(points[1]?.y).toBe(0)
  })
  it('does not divide by zero with a flat range or a single value', () => {
    const { points } = lineSegments([5], size, 5, 5)
    expect(Number.isFinite(points[0]?.x)).toBe(true)
    expect(Number.isFinite(points[0]?.y)).toBe(true)
  })
})
