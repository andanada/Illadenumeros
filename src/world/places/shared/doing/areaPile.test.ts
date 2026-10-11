import { describe, expect, it } from 'vitest'
import { centreOf, pileSpots } from './areaPile'

const area = { x: 0.1, y: 0.7, w: 0.3, h: 0.2 }

describe('pileSpots', () => {
  it('lays n pieces out, all different, all inside the area (plus the stagger) and on the stage', () => {
    for (const n of [1, 5, 6, 7, 13, 22]) {
      const spots = pileSpots(n, area)
      expect(spots).toHaveLength(n)
      expect(new Set(spots.map((p) => `${p.x.toFixed(3)}/${p.y.toFixed(3)}`)).size).toBe(n)
      for (const p of spots) {
        expect(p.x).toBeGreaterThanOrEqual(area.x)
        expect(p.x).toBeLessThanOrEqual(area.x + area.w + 0.05)
        expect(p.y).toBeGreaterThan(area.y)
        expect(p.y).toBeLessThanOrEqual(area.y + area.h)
      }
    }
  })

  it('uses at most four rows and keeps small piles in one row', () => {
    expect(new Set(pileSpots(5, area).map((p) => p.y)).size).toBe(1)
    expect(new Set(pileSpots(22, area).map((p) => p.y)).size).toBe(4)
  })

  it('is empty for nothing and never leaves the stage', () => {
    expect(pileSpots(0, area)).toEqual([])
    for (const p of pileSpots(22, { x: 0.8, y: 0.9, w: 0.3, h: 0.3 })) {
      expect(p.x).toBeLessThanOrEqual(0.97)
      expect(p.y).toBeLessThanOrEqual(0.97)
    }
  })

  it('knows the middle of an area', () => {
    expect(centreOf(area).x).toBeCloseTo(0.25)
    expect(centreOf(area).y).toBeCloseTo(0.8)
  })
})
