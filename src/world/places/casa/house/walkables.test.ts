import { describe, expect, it } from 'vitest'
import type { Placement } from '../../../model/types'
import { floorGrid, snapToFloor } from '../../../sandbox/logic/walkPlan'
import { fixedWalkables, placedWalkables, walkablesOf } from './walkables'
import { encodeX, FLOOR_TOP } from './zones'

const size = { w: 1024, h: 220 }
const piece = (uid: string, item: string, zone: 'sala' | 'cuina' | 'habitacio', x = 0.5, y = 0.85): Placement => ({ uid, item, x: encodeX(zone, x), y, z: 0 })

describe('walkables', () => {
  it('a placed sofa blocks its base and offers two seats inside the floor', () => {
    const w = placedWalkables('baixa', [piece('h1', 'sofa', 'sala')], size)
    expect(w.blocks).toHaveLength(1)
    expect(w.seats).toHaveLength(2)
    for (const s of w.seats) {
      expect(s.at.y).toBeGreaterThan(FLOOR_TOP)
      expect(s.at.y).toBeLessThanOrEqual(0.97)
    }
  })

  it('pieces of other floors do not count', () => {
    expect(placedWalkables('baixa', [piece('h1', 'llit', 'habitacio')], size).seats).toHaveLength(0)
    expect(placedWalkables('pis', [piece('h1', 'llit', 'habitacio')], size).seats).toHaveLength(1)
  })

  it('rugs, wall pieces and cushions never block', () => {
    const w = placedWalkables('baixa', [piece('h1', 'catifa-rodona', 'sala'), piece('h2', 'quadre-sol', 'sala', 0.5, 0.3), piece('h3', 'coixi', 'sala')], size)
    expect(w.blocks).toHaveLength(0)
  })

  it('tables take carried things', () => {
    expect(placedWalkables('baixa', [piece('h1', 'taula', 'cuina')], size).surfaces).toHaveLength(1)
  })

  it('the stairs stay reachable with the house full of furniture', () => {
    const everything = ['sofa', 'armari', 'tele', 'taula', 'prestatgeria'].map((item, i) => piece(`h${i}`, item, 'sala', 0.1 + i * 0.2))
    const w = walkablesOf('baixa', everything, size)
    const grid = floorGrid(w.blocks, FLOOR_TOP)
    const spot = snapToFloor(grid, { x: 0.05, y: FLOOR_TOP + 0.07 })
    expect(Math.abs(spot.x - 0.05)).toBeLessThan(0.1)
    expect(fixedWalkables('baixa', size).seats).toHaveLength(2)
  })
})
