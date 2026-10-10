import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { avoidRects, insideAny, petLayer, stackFor } from './layers'

describe('layers', () => {
  it('a pet is behind persons at the same depth', () => {
    expect(petLayer({ x: 0.5, y: 0.8 }, 0.1, 0.1, [])).toBe(stackFor(0.8) - 120)
  })

  it('a pet in front of a door goes under the door; one far away is unaffected', () => {
    const door = { x: 0.4, y: 0.1, w: 0.13, h: 0.38, z: stackFor(0.48) - 2 }
    const near = petLayer({ x: 0.45, y: 0.9 }, 0.1, 0.2, [{ ...door, y: 0.55 - 0.38 + 0.3 }])
    expect(near).toBeLessThan(door.z)
    expect(petLayer({ x: 0.9, y: 0.9 }, 0.1, 0.1, [door])).toBe(stackFor(0.9) - 120)
  })

  it('pushes a spot out of a rectangle, and leaves others alone', () => {
    const r = { x: 0.4, y: 0.6, w: 0.2, h: 0.2 }
    const out = avoidRects({ x: 0.5, y: 0.7 }, [r])
    expect(insideAny([r], out)).toBe(false)
    expect(avoidRects({ x: 0.1, y: 0.7 }, [r])).toEqual({ x: 0.1, y: 0.7 })
  })

  it('property: the result is never inside a single rectangle', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.05, max: 0.95, noNaN: true }), fc.double({ min: 0.05, max: 0.95, noNaN: true }), (x, y) => {
        const r = { x: 0.3, y: 0.4, w: 0.3, h: 0.3 }
        return !insideAny([r], avoidRects({ x, y }, [r]))
      }),
    )
  })
})
