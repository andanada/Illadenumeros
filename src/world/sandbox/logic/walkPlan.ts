import type { Pt } from './actorMachine'
import { findPath, isFree, makeGrid, nearestFree, type Cell, type Grid } from './pathfind'

/** A blocked rectangle of the floor, in scene fractions. */
export interface Block {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export const COLS = 28
export const ROWS = 14

/** Floor grid of a scene: the area y ∈ [floorTop, 1] is walkable except the blocks. */
export function floorGrid(blocks: readonly Block[], floorTop: number): Grid {
  const blocked: Array<[number, number]> = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const p = cellCentre({ col, row })
      const offFloor = p.y < floorTop
      const hit = blocks.some((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
      if (offFloor || hit) blocked.push([col, row])
    }
  }
  return makeGrid(COLS, ROWS, blocked)
}

export const cellCentre = (c: Cell): Pt => ({ x: (c.col + 0.5) / COLS, y: (c.row + 0.5) / ROWS })
export const cellOf = (p: Pt): Cell => ({ col: Math.min(COLS - 1, Math.max(0, Math.floor(p.x * COLS))), row: Math.min(ROWS - 1, Math.max(0, Math.floor(p.y * ROWS))) })

/** Where an actor can really stand: `p` itself when free, otherwise the nearest free cell centre. */
export function snapToFloor(grid: Grid, p: Pt): Pt {
  const cell = cellOf(p)
  if (isFree(grid, cell)) return p
  const free = nearestFree(grid, cell)
  return free ? cellCentre(free) : p
}

/** Waypoints from `from` to `to` around the blocks (the exact target as the last point). [] = nowhere to go. */
export function planWalk(grid: Grid, from: Pt, to: Pt): Pt[] {
  const target = snapToFloor(grid, to)
  const start = cellOf(from)
  const startCell = isFree(grid, start) ? start : nearestFree(grid, start)
  if (!startCell) return []
  const cells = findPath(grid, startCell, cellOf(target))
  if (cells.length === 0) {
    const sameCell = cellOf(target).col === startCell.col && cellOf(target).row === startCell.row
    return sameCell ? [target] : []
  }
  const mids = cells.slice(0, -1).map(cellCentre)
  return [...mids, target]
}
