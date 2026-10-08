import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { contains, cycleIndex, zoneAt, type ZoneShape } from './hitTest'

const zone = (id: string, left: number, top: number, width = 100, height = 100, z?: number): ZoneShape => ({ id, rect: { left, top, width, height }, ...(z !== undefined ? { z } : {}) })

describe('zoneAt', () => {
  const shelf = zone('shelf', 0, 0)
  const basket = zone('basket', 50, 50, 100, 100, 2)

  it('finds the zone under the point, with a little slop', () => {
    expect(zoneAt([shelf], { x: 10, y: 10 })?.id).toBe('shelf')
    expect(zoneAt([shelf], { x: 110, y: 50 })?.id).toBe('shelf')
    expect(zoneAt([shelf], { x: 110, y: 50 }, () => true, 0)).toBeUndefined()
    expect(zoneAt([shelf], { x: 300, y: 300 })).toBeUndefined()
  })

  it('prefers the higher zone, then the nearest centre', () => {
    expect(zoneAt([shelf, basket], { x: 60, y: 60 })?.id).toBe('basket')
    const a = zone('a', 0, 0)
    const b = zone('b', 80, 0)
    expect(zoneAt([a, b], { x: 95, y: 50 })?.id).toBe('b')
    expect(zoneAt([a, b], { x: 70, y: 50 })?.id).toBe('a')
  })

  it('skips zones that do not accept the prop', () => {
    expect(zoneAt([shelf, basket], { x: 60, y: 60 }, (z) => z.id !== 'basket')?.id).toBe('shelf')
  })

  it('property: a returned zone always contains the point (with slop) and accepts', () => {
    const arbZone = fc.record({ id: fc.string(), left: fc.integer({ min: 0, max: 500 }), top: fc.integer({ min: 0, max: 500 }), w: fc.integer({ min: 1, max: 200 }), h: fc.integer({ min: 1, max: 200 }) })
    fc.assert(
      fc.property(fc.array(arbZone, { maxLength: 6 }), fc.integer({ min: 0, max: 700 }), fc.integer({ min: 0, max: 700 }), (raw, x, y) => {
        const zones = raw.map((r) => zone(r.id, r.left, r.top, r.w, r.h))
        const hit = zoneAt(zones, { x, y }, (z) => z.rect.width > 50)
        if (hit) {
          expect(contains(hit.rect, { x, y }, 16)).toBe(true)
          expect(hit.rect.width).toBeGreaterThan(50)
        } else expect(zones.some((z) => z.rect.width > 50 && contains(z.rect, { x, y }, 16))).toBe(false)
      }),
    )
  })
})

describe('cycleIndex', () => {
  it('wraps both ways and starts at the right end', () => {
    expect(cycleIndex(-1, 3, 1)).toBe(0)
    expect(cycleIndex(-1, 3, -1)).toBe(2)
    expect(cycleIndex(2, 3, 1)).toBe(0)
    expect(cycleIndex(0, 3, -1)).toBe(2)
    expect(cycleIndex(0, 0, 1)).toBe(-1)
  })
})
