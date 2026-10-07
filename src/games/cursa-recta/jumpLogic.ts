import type { Item } from '../../core/ambit/types'

export const JUMPS = [10, 1, -10, -1] as const
export type Jump = (typeof JUMPS)[number]

export const LINE_MIN = 0
export const LINE_MAX = 199

export type RaceTask =
  | { kind: 'jump'; start: number; target: number }
  | { kind: 'read'; from: number; to: number; target: number }

/** Reads the race from an item: jump tasks (a ± b) or number-line reading (B2). */
export function parseRaceTask(item: Item): RaceTask | undefined {
  const ops = item.operands
  if (ops && (ops.op === '+' || ops.op === '-')) {
    return { kind: 'jump', start: ops.a, target: ops.op === '+' ? ops.a + ops.b : ops.a - ops.b }
  }
  const line = item.visual.kind === 'numberLine' ? item.visual : item.hintVisual.kind === 'numberLine' ? item.hintVisual : undefined
  if (line) return { kind: 'read', from: line.from, to: line.to, target: line.target }
  return undefined
}

export const canJump = (position: number, jump: Jump): boolean => position + jump >= LINE_MIN && position + jump <= LINE_MAX

/** Positions visited, starting at `start` (inclusive). */
export function positionsOf(start: number, jumps: readonly Jump[]): number[] {
  return jumps.reduce<number[]>((acc, jump) => [...acc, (acc[acc.length - 1] as number) + jump], [start])
}

export const positionAfter = (start: number, jumps: readonly Jump[]): number => jumps.reduce<number>((p, j) => p + j, start)

/** Fewest jumps (of 10 and 1, both directions) between two numbers: tens first, maybe overshooting. */
export function minJumps(start: number, target: number): number {
  const d = Math.abs(target - start)
  const ones = d % 10
  const tens = Math.floor(d / 10)
  return Math.min(tens + ones, tens + 1 + ((10 - ones) % 10))
}

export interface PathReport {
  reached: boolean
  count: number
  ones: number
  min: number
  /** Within one jump of the shortest path. */
  efficient: boolean
  /** Reached the target with many 1-jumps: offer the "salts de 10" tip. */
  suggestTens: boolean
}

export function evaluatePath(start: number, target: number, jumps: readonly Jump[]): PathReport {
  const reached = positionAfter(start, jumps) === target
  const ones = jumps.filter((j) => Math.abs(j) === 1).length
  const min = minJumps(start, target)
  const efficient = jumps.length <= min + 1
  return { reached, count: jumps.length, ones, min, efficient, suggestTens: reached && !efficient && ones >= 4 }
}

/** Visible window [lo, hi] (multiples of 10) that holds start, target and every position, with padding. */
export function windowFor(positions: readonly number[], target: number): { lo: number; hi: number } {
  const all = [...positions, target]
  const lo = Math.max(LINE_MIN, Math.floor((Math.min(...all) - 5) / 10) * 10)
  let hi = Math.min(LINE_MAX + 1, Math.ceil((Math.max(...all) + 5) / 10) * 10)
  if (hi - lo < 20) hi = Math.min(LINE_MAX + 1, lo + 20)
  return { lo, hi }
}

export const jumpLabel = (jump: Jump): string => (jump > 0 ? `+${jump}` : `−${Math.abs(jump)}`)
