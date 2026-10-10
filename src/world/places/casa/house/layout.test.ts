import { describe, expect, it } from 'vitest'
import { houseLayout } from './layout'

describe('houseLayout', () => {
  it.each([
    [1024, 768],
    [1180, 820],
    [1440, 900],
    [1366, 768],
  ])('fits %i x %i with no scroll', (w, h) => {
    const l = houseLayout(w, h)
    expect(l.scrolls).toBe(false)
    expect(l.total).toBeLessThanOrEqual(h)
    expect(l.floorH).toBeGreaterThanOrEqual(180)
  })

  it('a portrait phone scrolls between floors, each floor still roomy', () => {
    const l = houseLayout(390, 844)
    expect(l.scrolls).toBe(true)
    expect(l.floorH).toBeGreaterThanOrEqual(250)
  })
})
