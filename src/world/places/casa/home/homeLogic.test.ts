import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { placementSchema, PALETTE_COLORS, type PaletteColor, type Placement } from '../../../model/types'
import { CASA_CATALOG, FURNITURE, FURNITURE_BY_ID } from '../furniture/catalog'
import { dropTarget } from './dropLogic'
import { clampLocal, defaultSpot, depthOf, inRoom, nextColor, nextZ, nudge, ROOMS, roomOfX, starterLayout, toLocalX, toSceneX } from './homeLogic'
import { freshPointIn, type PointerTrack } from './useLastPointer'

const rect = { left: 100, top: 50, width: 600, height: 400 }
const p = (x: number, y: number, z = 0): Placement => ({ uid: `u${x}${y}${z}`, item: 'sofa', x, y, z })

describe('furniture catalogue', () => {
  it('has at least 24 original pieces, priced 0..60, with a few free starters', () => {
    expect(FURNITURE.length).toBeGreaterThanOrEqual(24)
    for (const f of FURNITURE) {
      expect(f.price, f.id).toBeGreaterThanOrEqual(0)
      expect(f.price, f.id).toBeLessThanOrEqual(60)
    }
    expect(FURNITURE.filter((f) => f.price === 0).length).toBeGreaterThanOrEqual(3)
    expect(new Set(FURNITURE.map((f) => f.id)).size).toBe(FURNITURE.length)
  })

  it('every entry is valid for the data layer (id pattern, scene casa) and matches its piece', () => {
    for (const e of CASA_CATALOG) {
      expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(e).toMatchObject({ kind: 'furniture', scene: 'casa', price: FURNITURE_BY_ID[e.id]?.price })
    }
  })

  it('exactly one bed and some lamps give the interactions', () => {
    expect(FURNITURE.filter((f) => f.action === 'bed')).toHaveLength(1)
    expect(FURNITURE.filter((f) => f.action === 'lamp').length).toBeGreaterThanOrEqual(3)
  })
})

describe('rooms and coordinates', () => {
  it('scene x splits into three rooms and converts back', () => {
    expect(ROOMS.map((r) => r.id)).toEqual(['sala', 'habitacio', 'cuina'])
    expect(roomOfX(0)).toBe('sala')
    expect(roomOfX(0.5)).toBe('habitacio')
    expect(roomOfX(1)).toBe('cuina')
    fc.assert(fc.property(fc.constantFrom(...ROOMS.map((r) => r.id)), fc.double({ min: 0.05, max: 0.95, noNaN: true }), (room, local) => {
      const x = toSceneX(room, local)
      expect(roomOfX(x)).toBe(room)
      expect(toLocalX(x)).toBeCloseTo(local, 6)
    }))
  })

  it('pieces are listed per room', () => {
    const list = [p(0.1, 0.8), p(0.5, 0.8), p(0.9, 0.8)]
    expect(inRoom(list, 'habitacio')).toEqual([list[1]])
  })

  it('nudging never leaves the room or its floor, and a step changes only one axis', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), fc.constantFrom('left', 'right', 'up', 'down' as const), (x, y, dir) => {
        const start = { x: toSceneX(roomOfX(x), clampLocal({ x: toLocalX(x), y }).x), y: clampLocal({ x: 0.5, y }).y }
        const moved = nudge(start, dir)
        expect(roomOfX(moved.x)).toBe(roomOfX(start.x))
        expect(moved.y).toBeLessThanOrEqual(1)
        expect(moved.y).toBeGreaterThanOrEqual(0.18)
        expect(placementSchema.safeParse({ uid: 'a', item: 'sofa', ...moved, z: 0 }).success).toBe(true)
      }),
    )
  })

  it('the starter pieces are valid placements, all free', () => {
    const list = starterLayout(1_700_000_000_000)
    expect(new Set(list.map((l) => l.uid)).size).toBe(list.length)
    for (const l of list) {
      expect(placementSchema.safeParse(l).success).toBe(true)
      expect(FURNITURE_BY_ID[l.item]?.price).toBe(0)
    }
  })

  it('depth: rugs behind, wall things next, standing pieces by how low they stand', () => {
    expect(depthOf({ y: 0.9, z: 0 }, { flat: true })).toBeLessThan(depthOf({ y: 0.3, z: 0 }, { wall: true }))
    expect(depthOf({ y: 0.3, z: 0 }, { wall: true })).toBeLessThan(depthOf({ y: 0.5, z: 0 }, {}))
    expect(depthOf({ y: 0.5, z: 0 }, {})).toBeLessThan(depthOf({ y: 0.9, z: 0 }, {}))
  })

  it('next z is one above the highest, colours cycle through the whole palette', () => {
    expect(nextZ([])).toBe(0)
    expect(nextZ([p(0.1, 0.1, 4), p(0.2, 0.2, 2)])).toBe(5)
    let c: PaletteColor = PALETTE_COLORS[0]
    for (let i = 0; i < PALETTE_COLORS.length; i++) c = nextColor(c, 'coral')
    expect(c).toBe(PALETTE_COLORS[0])
    expect(defaultSpot('cuina', 7, true).y).toBeLessThan(defaultSpot('cuina', 7, false).y)
  })
})

describe('where a drop lands', () => {
  const now = 1000
  const at = (x: number, y: number, ageMs = 0) => ({ x, y, at: now - ageMs })
  const track = (down: ReturnType<typeof at> | undefined, last: ReturnType<typeof at> | undefined): PointerTrack => ({ down, last })

  it('a new piece stands where she let go (feet a little below the finger)', () => {
    const t = dropTarget({ room: 'sala', rect, track: track(at(400, 300), at(400, 250)), now, count: 0, wall: false })
    expect(roomOfX(t.x)).toBe('sala')
    expect(toLocalX(t.x)).toBeCloseTo(0.5, 5)
    expect(t.y).toBeCloseTo(0.5 + 0.06, 5)
  })

  it('a dragged piece moves by the finger’s travel, not under the finger', () => {
    const start = { x: toSceneX('habitacio', 0.3), y: 0.8 }
    const t = dropTarget({ room: 'habitacio', rect, track: track(at(250, 400), at(370, 400)), now, moving: start, count: 3, wall: false })
    expect(toLocalX(t.x)).toBeCloseTo(0.3 + 120 / 600, 5)
    expect(t.y).toBeCloseTo(0.8, 5)
  })

  it('keyboard / tap-to-place without a fresh finger: the piece stays, a new one gets a free spot', () => {
    const start = { x: toSceneX('sala', 0.4), y: 0.7 }
    expect(dropTarget({ room: 'sala', rect, track: track(undefined, undefined), now, moving: start, count: 0, wall: false })).toEqual(start)
    expect(dropTarget({ room: 'sala', rect, track: track(at(0, 0), at(0, 0)), now, count: 2, wall: true })).toEqual(defaultSpot('sala', 2, true))
    expect(dropTarget({ room: 'sala', rect, track: track(at(400, 300, 5000), at(400, 300, 5000)), now, count: 2, wall: false })).toEqual(defaultSpot('sala', 2, false))
  })

  it('never outside the room, however far the finger went', () => {
    const t = dropTarget({ room: 'cuina', rect, track: track(at(400, 300), at(9000, 9000)), now, moving: { x: 0.9, y: 0.9 }, count: 0, wall: false })
    expect(freshPointIn(at(9000, 9000), rect, now)).toBeUndefined()
    expect(roomOfX(t.x)).toBe('cuina')
  })
})
