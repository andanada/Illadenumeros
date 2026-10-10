import type { Item } from '../../../../core/ambit/types'

export interface CutTask {
  /** Slices the pizza is cut into. */
  readonly parts: number
  /** Slices that go to the customer. */
  readonly selected: number
}

/** The cutter makes these numbers of slices (the child picks one; the customer asks for one of them). */
export const CUTS = [2, 3, 4, 6, 8] as const
export const MAX_SLICES = 8

/** «Quina part està pintada?» (C8 on a whole): the world version is cut and give. Anything else is undefined. */
export function cutFromItem(item: Item): CutTask | undefined {
  const v = item.hintVisual
  if (item.skillId !== 'C8' || v.kind !== 'fraction' || v.collection !== undefined) return undefined
  if (!CUTS.includes(v.parts as (typeof CUTS)[number]) || v.selected < 1 || v.selected >= v.parts) return undefined
  if (item.answer !== `${v.selected}/${v.parts}`) return undefined
  return { parts: v.parts, selected: v.selected }
}

/** The fraction she really made: pieces handed over out of the pieces the pizza was cut in. */
export const fractionMade = (given: number, slices: number): string => `${given}/${slices}`

/** Angles (degrees, 0 = top, clockwise) of the slice `i` of a pizza cut in `parts`. */
export function sliceSpan(parts: number, i: number): { from: number; to: number } {
  const step = 360 / Math.max(1, parts)
  return { from: i * step, to: (i + 1) * step }
}

/** Words for the customer: «Talla la pizza en 8 parts iguals i dóna’n 3 a la Fàtima.» */
export const cutWords = (task: CutTask, toWhom: string): string => `Talla la pizza en ${task.parts} parts iguals i dóna’n ${task.selected} ${toWhom}.`
