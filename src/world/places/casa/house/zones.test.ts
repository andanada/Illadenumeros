import { describe, expect, it } from 'vitest'
import type { Placement } from '../../../model/types'
import { decode, defaultSpot, encodeX, FLOORS, localX, migrate, newHouseUid, nudge, placementsIn, placementsOnFloor, stageX, starterLayout, ZONES, zoneAt } from './zones'

const piece = (uid: string, x: number, y = 0.8): Placement => ({ uid, item: 'cadira', x, y, z: 0 })

describe('zones', () => {
  it('floors hold two zones each and cover every zone once', () => {
    expect(FLOORS.flatMap((f) => f.zones).sort()).toEqual(ZONES.map((z) => z.id).sort())
  })

  it('new pieces round-trip through every zone', () => {
    for (const z of ZONES) {
      const p = piece(newHouseUid(1, 1), encodeX(z.id, 0.37))
      const s = decode(p)
      expect(s.zone).toBe(z.id)
      expect(s.x).toBeCloseTo(0.37, 6)
    }
  })

  it('old three-room pieces keep their room (sala | habitació | cuina)', () => {
    expect(decode(piece('m1', 0.1)).zone).toBe('sala')
    expect(decode(piece('m1', 0.5)).zone).toBe('habitacio')
    expect(decode(piece('m1', 0.9)).zone).toBe('cuina')
    expect(decode(piece('m1', 1)).zone).toBe('cuina')
  })

  it('migrating an old piece keeps its room and local position, with a house uid', () => {
    const old = piece('mabc', 0.5 + 0.1, 0.7)
    const next = migrate(old, 3, 99)
    expect(next.uid.startsWith('h')).toBe(true)
    expect(decode(next).zone).toBe('habitacio')
    expect(decode(next).x).toBeCloseTo(decode(old).x, 6)
    expect(next.y).toBe(0.7)
  })

  it('stage x stays between the stair columns and maps back', () => {
    for (const z of ZONES) {
      expect(stageX(z.id, 0)).toBeGreaterThanOrEqual(0.1 - 1e-9)
      expect(stageX(z.id, 1)).toBeLessThanOrEqual(0.9 + 1e-9)
      expect(localX(z.id, stageX(z.id, 0.4))).toBeCloseTo(0.4, 6)
    }
    expect(zoneAt('baixa', 0.2)).toBe('sala')
    expect(zoneAt('baixa', 0.7)).toBe('cuina')
  })

  it('filters by zone and floor', () => {
    const list = [piece('h1', encodeX('bany', 0.5)), piece('h2', encodeX('sala', 0.5)), piece('h3', encodeX('habitacio', 0.5))]
    expect(placementsIn(list, 'bany').map((p) => p.uid)).toEqual(['h1'])
    expect(placementsOnFloor(list, 'pis').map((p) => p.uid)).toEqual(['h1', 'h3'])
  })

  it('nudging never leaves the zone', () => {
    let p = piece('h1', encodeX('bany', 0.9), 0.9)
    for (let i = 0; i < 20; i++) p = { ...p, ...nudge(p, 'right') }
    expect(decode(p).zone).toBe('bany')
    for (let i = 0; i < 30; i++) p = { ...p, ...nudge(p, 'left') }
    expect(decode(p).zone).toBe('bany')
    expect(decode(p).x).toBeGreaterThanOrEqual(0.06 - 1e-9)
  })

  it('default spots stay in the asked zone and starter pieces are free ones', () => {
    for (let i = 0; i < 8; i++) expect(decode({ uid: 'h', ...defaultSpot('terrassa', i, false) }).zone).toBe('terrassa')
    expect(starterLayout(5).map((p) => p.item).sort()).toEqual(['cadira', 'catifa-rodona', 'coixi', 'llit', 'planta-test'])
  })
})
