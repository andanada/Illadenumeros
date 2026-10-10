import { describe, expect, it } from 'vitest'
import { bowlName, shareZones, BOWL_IDS } from './shareLayout'
import type { ShareTask } from './shareLogic'

const task = (parts: number, total: number, size: number, mode: ShareTask['mode'] = 'each'): ShareTask => ({ mode, total, size, parts, expected: Math.floor(total / size), remainder: total % size })

describe('shareZones', () => {
  it.each([
    [2, 20, 2],
    [4, 12, 4],
    [8, 40, 8],
    [5, 25, 5],
  ])('%i bowls for %i things all fit inside the stage without overlapping', (parts, total, size) => {
    const zones = shareZones(task(parts, total, size), 'hort')
    expect(zones).toHaveLength(parts)
    for (const z of zones) {
      expect(z.rect.x).toBeGreaterThanOrEqual(0.28)
      expect(z.rect.x + z.rect.w).toBeLessThanOrEqual(1)
      expect(z.rect.y + z.rect.h).toBeLessThanOrEqual(1)
    }
    for (const [i, a] of zones.entries())
      for (const b of zones.slice(i + 1)) {
        const apart = a.rect.x + a.rect.w <= b.rect.x || b.rect.x + b.rect.w <= a.rect.x || a.rect.y + a.rect.h <= b.rect.y || b.rect.y + b.rect.h <= a.rect.y
        expect(apart).toBe(true)
      }
  })
  it('a bowl holds the quotient and one more; a carton holds exactly its size', () => {
    expect(shareZones(task(4, 12, 4), 'hort')[0]?.capacity).toBe(4)
    expect(shareZones(task(4, 12, 3, 'groups'), 'hort')[0]?.capacity).toBe(3)
  })
  it('names the bowls after the animals', () => {
    expect(BOWL_IDS(3)).toEqual(['bol-1', 'bol-2', 'bol-3'])
    expect(bowlName(0)).toBe('el bol de la Nyx')
  })
})
