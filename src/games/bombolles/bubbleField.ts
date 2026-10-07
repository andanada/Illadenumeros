import type { Item } from '../../core/ambit/types'
import type { Rng } from '../../core/rng'

export interface BubbleTask {
  /** What the pair must add up to (10, or 5..9 for decomposing). */
  total: number
  /** The number to pair (highlighted bubble). */
  a: number
  /** Its friend: total - a. */
  friend: number
  /** Bridging variant (A8): after making 10, add `rest` to get the answer. */
  bridge?: { rest: number; sum: number }
}

/** Reads the target pair from an item (A5, A3 or A8). Returns undefined if not applicable. */
export function parseBubbleTask(item: Item): BubbleTask | undefined {
  const ops = item.operands
  if (item.skillId === 'A8' && ops && ops.op === '+') {
    const big = Math.max(ops.a, ops.b)
    const small = Math.min(ops.a, ops.b)
    const friend = 10 - big
    return { total: 10, a: big, friend, bridge: { rest: small - friend, sum: ops.a + ops.b } }
  }
  if (item.skillId === 'A5' && ops) return { total: 10, a: ops.a, friend: 10 - ops.a }
  const match = /^(\d+) = (\d+) \+ \?$/.exec(item.text)
  if (match) {
    const total = Number(match[1])
    const a = Number(match[2])
    return { total, a, friend: total - a }
  }
  return undefined
}

export interface Bubble {
  id: string
  value: number
  role: 'target' | 'friend' | 'decoy'
  /** Position in % of the field. */
  x: number
  y: number
  /** Index into the bubble palette. */
  hue: number
  /** Drift phase, seconds. */
  phase: number
}

/** True if any two values (by index) add up to `total`. */
export function hasPair(values: readonly number[], total: number): boolean {
  return values.some((v, i) => values.some((w, j) => i !== j && v + w === total))
}

/** Count of index pairs adding up to `total`. */
export function countPairs(values: readonly number[], total: number): number {
  let count = 0
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) if ((values[i] as number) + (values[j] as number) === total) count++
  }
  return count
}

/** Decoy values: unique, never complete a second pair with anything in the field. */
export function pickDecoys(task: BubbleTask, count: number, rng: Rng): number[] {
  const chosen: number[] = []
  const base = [task.a, task.friend]
  const pool = rng.shuffle(Array.from({ length: Math.max(10, task.total) }, (_, i) => i + 1))
  for (const value of pool) {
    if (chosen.length >= count) break
    if (base.includes(value) || chosen.includes(value)) continue
    const all = [...base, ...chosen, value]
    if (countPairs(all, task.total) === 1) chosen.push(value)
  }
  return chosen
}

const COLS = 4
const ROWS = 3

/** Bubble field: the target, its friend and 3-4 decoys placed on a jittered grid. Exactly one valid pair. */
export function generateBubbleField(task: BubbleTask, rng: Rng): Bubble[] {
  const decoys = pickDecoys(task, rng.int(3, 4), rng)
  const values: { value: number; role: Bubble['role'] }[] = [
    { value: task.a, role: 'target' },
    { value: task.friend, role: 'friend' },
    ...decoys.map((value) => ({ value, role: 'decoy' as const })),
  ]
  const slots = rng.shuffle(Array.from({ length: COLS * ROWS }, (_, i) => i))
  return values.map((entry, i) => {
    const slot = slots[i] as number
    const col = slot % COLS
    const row = Math.floor(slot / COLS)
    return {
      id: `b${i}-${entry.value}`,
      value: entry.value,
      role: entry.role,
      x: ((col + 0.5) / COLS) * 100 + (rng.next() - 0.5) * 6,
      y: ((row + 0.5) / ROWS) * 100 + (rng.next() - 0.5) * 8,
      hue: rng.int(0, 3),
      phase: rng.next() * 3,
    }
  })
}
