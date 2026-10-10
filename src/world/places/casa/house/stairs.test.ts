import { describe, expect, it } from 'vitest'
import { floorGrid } from '../../../sandbox/logic/walkPlan'
import { isFree } from '../../../sandbox/logic/pathfind'
import { cellOf } from '../../../sandbox/logic/walkPlan'
import { FRONT_DOOR, route, STAIRS, stairsOn } from './stairs'
import { FLOOR_TOP } from './zones'

describe('stairs', () => {
  it('every stair has a way back', () => {
    for (const s of STAIRS) expect(STAIRS.some((b) => b.floor === s.to && b.to === s.floor)).toBe(true)
  })

  it('routes climb one floor at a time, both ways', () => {
    expect(route('baixa', 'golfes').map((s) => s.id)).toEqual(['escala-baixa-up', 'escala-pis-up'])
    expect(route('golfes', 'baixa').map((s) => s.id)).toEqual(['escala-golfes-down', 'escala-pis-down'])
    expect(route('pis', 'pis')).toEqual([])
  })

  it('the front door is on the ground floor and every top step is standable', () => {
    const grid = floorGrid([], FLOOR_TOP)
    for (const s of [...STAIRS, FRONT_DOOR]) {
      expect(isFree(grid, cellOf(s.at))).toBe(true)
      expect(isFree(grid, cellOf(s.landing))).toBe(true)
    }
    expect(stairsOn('baixa')).toHaveLength(1)
  })
})
