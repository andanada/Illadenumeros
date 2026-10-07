import { describe, expect, it } from 'vitest'
import { plateLayout } from './plateLayout'

const PLATE = 104
const MAX = 34

describe('plateLayout', () => {
  it('returns nothing for an empty plate and the centre for a single candy', () => {
    expect(plateLayout(0, PLATE, MAX).positions).toEqual([])
    const one = plateLayout(1, PLATE, MAX)
    expect(one.positions).toEqual([{ x: 0, y: 0 }])
    expect(one.candy).toBe(MAX)
  })

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))('packs %i candies without overlap inside the plate', (n) => {
    const { positions, candy } = plateLayout(n, PLATE, MAX)
    expect(positions).toHaveLength(n)
    expect(candy).toBeGreaterThan(8)
    expect(candy).toBeLessThanOrEqual(MAX)
    for (const p of positions) expect(Math.hypot(p.x, p.y) + candy / 2).toBeLessThanOrEqual(PLATE * 0.5)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = positions[i]
        const b = positions[j]
        expect(Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0))).toBeGreaterThanOrEqual(candy * 0.99)
      }
    }
  })

  it('is centred horizontally and vertically', () => {
    for (const n of [2, 3, 5, 7, 8, 10]) {
      const { positions } = plateLayout(n, PLATE, MAX)
      const minY = Math.min(...positions.map((p) => p.y))
      const maxY = Math.max(...positions.map((p) => p.y))
      expect(minY + maxY).toBeCloseTo(0, 5)
      const rowsX = positions.filter((p) => p.y === minY).map((p) => p.x)
      expect(Math.min(...rowsX) + Math.max(...rowsX)).toBeCloseTo(0, 5)
    }
  })

  it('shrinks the candies as the count grows and is deterministic', () => {
    expect(plateLayout(9, PLATE, MAX).candy).toBeLessThan(plateLayout(2, PLATE, MAX).candy)
    expect(plateLayout(7, PLATE, MAX)).toEqual(plateLayout(7, PLATE, MAX))
  })

  it('survives odd input', () => {
    expect(plateLayout(-3, PLATE, MAX).positions).toEqual([])
    expect(plateLayout(Number.NaN, PLATE, MAX).positions).toEqual([])
  })
})
