import type { ItemState, Items } from '../../../sandbox/logic/itemsState'
import { qtyOf, zoneItems } from '../../../sandbox/logic/zones'

/** The defs lying in a zone, one entry per thing (a stack counts its quantity). */
export function zoneDefs(items: Items, zoneId: string): string[] {
  return zoneItems(items, zoneId).flatMap((i) => Array.from({ length: qtyOf(i) }, () => i.def))
}

/** Slots a counting zone needs: whole rows of `cols`, never fewer than `min` (a ten-frame), room for the spare things of the pile. */
export function zoneSlots(things: number, cols: number, min = 10): number {
  return Math.max(min, Math.ceil(things / cols) * cols)
}

export interface Thing {
  readonly uid: string
  readonly def: string
}

export interface SolutionMoves {
  /** Things in the zone that are too many: they leave it. */
  readonly out: readonly string[]
  /** Loose things that join the zone. */
  readonly into: readonly string[]
  /** Defs still missing after that: they are made on the spot. */
  readonly make: readonly string[]
}

/**
 * What it takes to lay the solution in the zone (after the last try): keep what already matches, send away the
 * rest, bring loose things of the missing defs, make whatever is still short. Pure; each thing is used once.
 */
export function solutionMoves(inZone: readonly Thing[], loose: readonly Thing[], solution: readonly string[]): SolutionMoves {
  const need = new Map<string, number>()
  for (const def of solution) need.set(def, (need.get(def) ?? 0) + 1)
  const out: string[] = []
  for (const t of inZone) {
    const n = need.get(t.def) ?? 0
    if (n > 0) need.set(t.def, n - 1)
    else out.push(t.uid)
  }
  const into: string[] = []
  const free = [...loose]
  const make: string[] = []
  for (const [def, count] of need) {
    for (let k = 0; k < count; k++) {
      const at = free.findIndex((t) => t.def === def)
      if (at >= 0) {
        const [taken] = free.splice(at, 1)
        if (taken) into.push(taken.uid)
      } else make.push(def)
    }
  }
  return { out, into, make }
}

/** Things of `mine` that lie loose on the floor (not in a zone, not held, not gone). */
export const looseOf = (items: Items, mine: readonly string[]): ItemState[] =>
  mine.flatMap((uid) => {
    const it = items[uid]
    return it && it.loc.t === 'floor' && it.zone === undefined ? [it] : []
  })
