import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { findPath, isFree, lineClear, makeGrid, nearestFree, type Grid } from './pathfind'

const wall = (cols: number, rows: number, col: number, gapRow: number): Grid => {
  const blocked: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) if (r !== gapRow) blocked.push([col, r])
  return makeGrid(cols, rows, blocked)
}

describe('pathfind', () => {
  it('goes straight when nothing is in the way', () => {
    const grid = makeGrid(10, 6, [])
    expect(findPath(grid, { col: 0, row: 0 }, { col: 9, row: 5 })).toEqual([{ col: 9, row: 5 }])
  })

  it('walks around a wall through its gap', () => {
    const grid = wall(10, 6, 5, 4)
    const path = findPath(grid, { col: 1, row: 1 }, { col: 8, row: 1 })
    expect(path.length).toBeGreaterThan(1)
    expect(path[path.length - 1]).toEqual({ col: 8, row: 1 })
    expect(path.some((p) => p.row === 4)).toBe(true)
  })

  it('returns [] when the target is walled off', () => {
    const grid = wall(10, 6, 5, -1)
    expect(findPath(grid, { col: 1, row: 1 }, { col: 8, row: 1 })).toEqual([])
  })

  it('same cell is an empty path', () => {
    expect(findPath(makeGrid(4, 4, []), { col: 1, row: 1 }, { col: 1, row: 1 })).toEqual([])
  })

  it('nearestFree moves a blocked target to a free neighbour', () => {
    const grid = makeGrid(5, 5, [[2, 2]])
    const free = nearestFree(grid, { col: 2, row: 2 })
    expect(free).toBeDefined()
    expect(free).not.toEqual({ col: 2, row: 2 })
    expect(nearestFree(makeGrid(1, 1, [[0, 0]]), { col: 0, row: 0 })).toBeUndefined()
  })

  it('lineClear sees walls', () => {
    const grid = wall(10, 6, 5, 4)
    expect(lineClear(grid, { col: 1, row: 1 }, { col: 8, row: 1 })).toBe(false)
    expect(lineClear(grid, { col: 1, row: 4 }, { col: 8, row: 4 })).toBe(true)
  })

  it('property: every waypoint is free and every leg is clear', () => {
    const cell = fc.tuple(fc.integer({ min: 0, max: 11 }), fc.integer({ min: 0, max: 7 }))
    fc.assert(
      fc.property(fc.array(cell, { maxLength: 30 }), cell, cell, (blocks, a, b) => {
        const grid = makeGrid(12, 8, blocks)
        const from = { col: a[0], row: a[1] }
        const path = findPath(grid, from, { col: b[0], row: b[1] })
        let prev = from
        for (const p of path) {
          expect(isFree(grid, p)).toBe(true)
          expect(lineClear(grid, prev, p)).toBe(true)
          prev = p
        }
        if (path.length > 0) expect(path[path.length - 1]).toEqual({ col: b[0], row: b[1] })
      }),
    )
  })
})
