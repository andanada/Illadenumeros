import { createRng } from '../../core/rng'

export const MIN_STEPS = 4
export const DEFAULT_STEPS = 8
export const MAX_STEPS = 10

/** Points per row of the zig-zag path. */
export const PER_ROW = 5
const COLUMN_X = [10, 30, 50, 70, 90] as const
const ROW_HEIGHT = 32
const TOP = 14
const JITTER_X = 4
const JITTER_Y = 4
const BRANCH_MIN = 8
const BRANCH_MAX = 11

export interface Point {
  x: number
  y: number
}

export interface Branch {
  from: Point
  to: Point
}

/** Number of questions of a maze: the host limit clamped to 4..10, 8 when playing freely. */
export function mazeLength(maxRounds: number | undefined): number {
  if (maxRounds === undefined) return DEFAULT_STEPS
  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.floor(maxRounds)))
}

/**
 * Points of the path in a 100-wide drawing: point i is the junction of question i,
 * the last point is the treasure chest. Rows alternate direction (left to right, right to left).
 */
export function mazePoints(steps: number, seed: string): Point[] {
  const rng = createRng(`maze:${seed}`)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const row = Math.floor(i / PER_ROW)
    const col = i % PER_ROW
    const column = COLUMN_X[row % 2 === 0 ? col : PER_ROW - 1 - col] ?? 50
    return {
      x: column + rng.int(-JITTER_X, JITTER_X),
      y: TOP + row * ROW_HEIGHT + rng.int(-JITTER_Y, JITTER_Y),
    }
  })
}

/** Height of the drawing that holds `points`. */
export const mazeHeight = (points: readonly Point[]): number => Math.max(...points.map((p) => p.y), 0) + TOP + 14

/** A short dead-end path above or below every junction (decoration: "the other way leads nowhere"). */
export function mazeBranches(points: readonly Point[], seed: string): Branch[] {
  const rng = createRng(`branch:${seed}`)
  return points.slice(0, -1).map((from) => {
    const up = rng.next() < 0.5
    const length = rng.int(BRANCH_MIN, BRANCH_MAX)
    return { from, to: { x: from.x + rng.int(-3, 3), y: Math.max(2, up ? from.y - length : from.y + length) } }
  })
}

/** Smooth SVG path through all the points. */
export function mazePathD(points: readonly Point[]): string {
  return points
    .map((p, i) => {
      const prev = points[i - 1]
      if (!prev) return `M ${p.x} ${p.y}`
      const midY = (prev.y + p.y) / 2
      return `C ${prev.x} ${midY} ${p.x} ${midY} ${p.x} ${p.y}`
    })
    .join(' ')
}

/** Where the explorer stands after `done` finished junctions. */
export function pointAt(points: readonly Point[], done: number): Point {
  const last = points[points.length - 1] ?? { x: 50, y: 0 }
  return points[Math.min(Math.max(0, Math.floor(done)), points.length - 1)] ?? last
}

export interface MazeProgress {
  done: number
  remaining: number
  finished: boolean
}

export function mazeProgress(done: number, steps: number): MazeProgress {
  const clamped = Math.min(Math.max(0, Math.floor(done)), steps)
  return { done: clamped, remaining: steps - clamped, finished: clamped >= steps }
}
