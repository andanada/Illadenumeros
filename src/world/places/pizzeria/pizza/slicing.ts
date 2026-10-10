import type { Items } from '../../../sandbox/logic/itemsState'
import { CUTS } from './cutLogic'

/** How many slices the cutter in someone's hand makes (`tallador-8` → 8). undefined when nobody holds one. */
export function cutterInHand(items: Items): number | undefined {
  for (const it of Object.values(items)) {
    if (it.loc.t !== 'held') continue
    const n = /^tallador-(\d+)$/.exec(it.def)?.[1]
    if (n && CUTS.includes(Number(n) as (typeof CUTS)[number])) return Number(n)
  }
  return undefined
}

export interface Cut {
  readonly uid: string
  readonly parts: number
  readonly room: string
  readonly at: { readonly x: number; readonly y: number }
}

/** Pizzas whose cut stage was just reached, with the number of slices the cutter makes. Pure. */
export function pizzasToSlice(items: Items): readonly Cut[] {
  const parts = cutterInHand(items) ?? 4
  return Object.values(items).flatMap((it) => (it.def === 'pizza-cuita' && it.chain.at >= 1 && it.loc.t === 'floor' ? [{ uid: it.uid, parts, room: it.loc.room, at: it.loc.at }] : []))
}

/** Where slice `i` of `n` lies around the pizza's place: a tidy ring, inside the stage. */
export function slicePoint(at: { x: number; y: number }, i: number, n: number): { x: number; y: number } {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2
  const cy = Math.min(0.9, Math.max(0.68, at.y))
  return { x: Math.min(0.95, Math.max(0.05, at.x + Math.cos(a) * 0.09)), y: Math.min(0.96, cy + Math.sin(a) * 0.06) }
}
