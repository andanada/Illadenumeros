import { describe, expect, it } from 'vitest'
import { centreOf, layoutStreet } from './streetLayout'

describe('layoutStreet', () => {
  it('lays the lots left to right, never overlapping, with scenery between them', () => {
    const layout = layoutStreet(['casa', 'botiga', 'autobus', 'perruqueria'])
    expect(layout.spots.map((s) => s.id)).toEqual(['casa', 'botiga', 'autobus', 'perruqueria'])
    layout.spots.slice(1).forEach((s, i) => {
      const before = layout.spots[i]
      if (!before) throw new Error('missing')
      expect(s.x).toBeGreaterThan(before.x + before.w)
    })
    const last = layout.spots[layout.spots.length - 1]
    expect(layout.length).toBeGreaterThan((last?.x ?? 0) + (last?.w ?? 0))
    // Scenery stands in the gaps, not in front of a door.
    for (const item of layout.scenery) {
      expect(layout.spots.some((s) => item.x + item.w > s.x + 1 && item.x < s.x + s.w - 1)).toBe(false)
    }
  })

  it('an empty street still has a length and a tree', () => {
    const layout = layoutStreet([])
    expect(layout.spots).toEqual([])
    expect(layout.scenery.length).toBeGreaterThan(0)
    expect(layout.length).toBeGreaterThan(0)
  })

  it('centreOf is the middle of the lot', () => {
    expect(centreOf({ x: 100, w: 200, h: 10 })).toBe(200)
  })
})
