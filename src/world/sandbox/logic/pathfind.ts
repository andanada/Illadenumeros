/** Grid pathfinding for actors walking inside a scene. Pure: A* on 8 directions, then smoothed to waypoints. */

export interface Cell {
  readonly col: number
  readonly row: number
}

export interface Grid {
  readonly cols: number
  readonly rows: number
  /** Blocked cells as row * cols + col. */
  readonly blocked: ReadonlySet<number>
}

export const makeGrid = (cols: number, rows: number, blocked: ReadonlyArray<readonly [number, number]>): Grid => ({
  cols,
  rows,
  blocked: new Set(blocked.filter(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows).map(([c, r]) => r * cols + c)),
})

const inside = (g: Grid, c: Cell): boolean => c.col >= 0 && c.row >= 0 && c.col < g.cols && c.row < g.rows
export const isFree = (g: Grid, c: Cell): boolean => inside(g, c) && !g.blocked.has(c.row * g.cols + c.col)
const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row

/** Nearest free cell to `target` (itself when free), or undefined when the grid is full. */
export function nearestFree(g: Grid, target: Cell): Cell | undefined {
  const t = { col: Math.min(g.cols - 1, Math.max(0, target.col)), row: Math.min(g.rows - 1, Math.max(0, target.row)) }
  let best: Cell | undefined
  let bestD = Infinity
  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.cols; col++) {
      if (!isFree(g, { col, row })) continue
      const d = (col - t.col) ** 2 + (row - t.row) ** 2
      if (d < bestD) {
        bestD = d
        best = { col, row }
      }
    }
  }
  return best
}

/** True when a straight walk between two cells never enters a blocked cell. */
export function lineClear(g: Grid, a: Cell, b: Cell): boolean {
  const steps = Math.max(Math.abs(b.col - a.col), Math.abs(b.row - a.row)) * 4
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    const cell = { col: Math.round(a.col + (b.col - a.col) * t), row: Math.round(a.row + (b.row - a.row) * t) }
    if (!isFree(g, cell)) return false
  }
  return true
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.4142],
  [1, -1, 1.4142],
  [-1, 1, 1.4142],
  [-1, -1, 1.4142],
]

const heuristic = (a: Cell, b: Cell): number => {
  const dx = Math.abs(a.col - b.col)
  const dy = Math.abs(a.row - b.row)
  return dx + dy - 0.5858 * Math.min(dx, dy)
}

/** Waypoints (cells after `from`) to reach `to`; [] when already there or unreachable. */
export function findPath(g: Grid, from: Cell, to: Cell): Cell[] {
  if (same(from, to) || !isFree(g, to) || !isFree(g, from)) return []
  const key = (c: Cell): number => c.row * g.cols + c.col
  const cost = new Map<number, number>([[key(from), 0]])
  const parent = new Map<number, Cell>()
  const open: Array<{ cell: Cell; f: number }> = [{ cell: from, f: heuristic(from, to) }]
  const closed = new Set<number>()
  while (open.length > 0) {
    open.sort((x, y) => x.f - y.f)
    const current = open.shift()?.cell
    if (!current) break
    if (same(current, to)) return smooth(g, from, rebuild(parent, current, key, from))
    if (closed.has(key(current))) continue
    closed.add(key(current))
    for (const [dc, dr, step] of NEIGHBOURS) {
      const next = { col: current.col + dc, row: current.row + dr }
      if (!isFree(g, next) || closed.has(key(next))) continue
      if (dc !== 0 && dr !== 0 && (!isFree(g, { col: current.col + dc, row: current.row }) || !isFree(g, { col: current.col, row: current.row + dr }))) continue
      const g2 = (cost.get(key(current)) ?? 0) + step
      if (g2 >= (cost.get(key(next)) ?? Infinity)) continue
      cost.set(key(next), g2)
      parent.set(key(next), current)
      open.push({ cell: next, f: g2 + heuristic(next, to) })
    }
  }
  return []
}

function rebuild(parent: ReadonlyMap<number, Cell>, end: Cell, key: (c: Cell) => number, from: Cell): Cell[] {
  const out: Cell[] = [end]
  let at = end
  for (let guard = 0; guard < 100000; guard++) {
    const p = parent.get(key(at))
    if (!p || same(p, from)) break
    out.unshift(p)
    at = p
  }
  return out
}

/** Drops waypoints that a straight clear line can skip. */
function smooth(g: Grid, from: Cell, cells: readonly Cell[]): Cell[] {
  const out: Cell[] = []
  let anchor = from
  let i = 0
  while (i < cells.length) {
    let far = i
    for (let j = cells.length - 1; j > i; j--) {
      const c = cells[j]
      if (c && lineClear(g, anchor, c)) {
        far = j
        break
      }
    }
    const pick = cells[far]
    if (!pick) break
    out.push(pick)
    anchor = pick
    i = far + 1
  }
  return out
}
