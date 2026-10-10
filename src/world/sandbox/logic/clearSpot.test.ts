import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { dist } from './actorMachine'
import { clearSpot } from './clearSpot'

const id = (p: { x: number; y: number }) => p

describe('clearSpot', () => {
  it('keeps the wanted spot when nothing is there', () => {
    expect(clearSpot([], { x: 0.5, y: 0.8 }, id)).toEqual({ x: 0.5, y: 0.8 })
  })

  it('moves aside from what lies there', () => {
    const spot = clearSpot([{ x: 0.5, y: 0.8 }], { x: 0.5, y: 0.8 }, id)
    expect(dist(spot, { x: 0.5, y: 0.8 })).toBeGreaterThanOrEqual(0.075)
  })

  it('property: stays inside the stage', () => {
    const pt = fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0, max: 1, noNaN: true }) })
    fc.assert(fc.property(fc.array(pt, { maxLength: 8 }), pt, (taken, want) => {
      const s = clearSpot(taken, want, id)
      expect(s.x).toBeGreaterThanOrEqual(0.04 - 1e-9)
      expect(s.x).toBeLessThanOrEqual(0.96 + 1e-9)
    }))
  })
})
