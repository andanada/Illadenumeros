import type { Item } from '../../core/ambit/types'

export const MAX_PARTS = 12
const MAX_COLLECTION = 40
const MAX_TAPPABLE_SLICES = 12

export type CakePlan =
  | { mode: 'whole'; parts: number; selected: number }
  | { mode: 'collection'; parts: number; selected: number; total: number }
  | { mode: 'equivalent'; parts: number; selected: number; targetParts?: number }
  | { mode: 'plain' }

export interface CakeView {
  parts: number
  selected: number
}

const TARGET_DENOMINATOR = /= \?\/(\d+)$/

/** Decides how a fraction item is played: cut/count a cake, share a collection, cut to equivalents, or plain choices. */
export function planFromItem(item: Item): CakePlan {
  const visual = item.hintVisual
  if (visual.kind !== 'fraction' || visual.parts < 1 || visual.parts > MAX_PARTS) return { mode: 'plain' }
  const { parts, selected, collection } = visual
  if (item.skillId === 'E9') {
    const target = TARGET_DENOMINATOR.exec(item.text.trim())?.[1]
    return target ? { mode: 'equivalent', parts, selected, targetParts: Number(target) } : { mode: 'equivalent', parts, selected }
  }
  if (collection !== undefined && collection > 0) {
    const fits = collection <= MAX_COLLECTION && collection % parts === 0
    return fits ? { mode: 'collection', parts, selected, total: collection } : { mode: 'plain' }
  }
  return parts <= MAX_TAPPABLE_SLICES ? { mode: 'whole', parts, selected } : { mode: 'plain' }
}

/** Start/end angle (radians, 0 = top, clockwise) of each slice of a cake cut in `parts`. */
export function sliceAngles(parts: number): { start: number; end: number }[] {
  const n = Math.max(1, Math.floor(parts))
  const step = (Math.PI * 2) / n
  return Array.from({ length: n }, (_, i) => ({ start: i * step, end: (i + 1) * step }))
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * Every way to cut the same part of the cake (same value), ordered by number of slices:
 * simpler forms when both terms share a divisor, then the multiples that fit in 12 slices.
 */
export function equivalentViews(parts: number, selected: number): CakeView[] {
  const divisor = gcd(parts, selected)
  const views: CakeView[] = []
  for (let d = divisor; d >= 1; d--) {
    if (divisor % d === 0) views.push({ parts: parts / d, selected: selected / d })
  }
  for (let k = 2; parts * k <= MAX_PARTS; k++) views.push({ parts: parts * k, selected: selected * k })
  return views.sort((x, y) => x.parts - y.parts)
}

/** Items in each of the `parts` equal groups. */
export const groupSize = (total: number, parts: number): number => Math.floor(total / Math.max(1, parts))

/** Items inside the first `groups` groups. */
export const paintedItems = (total: number, parts: number, groups: number): number =>
  groupSize(total, parts) * Math.min(Math.max(0, Math.floor(groups)), parts)

const groupWord = (n: number): string => (n === 1 ? 'grup' : 'grups')

/** Live caption of a shared collection: what to do next, then the result "3 grups de 3 = 9". */
export function collectionCaption(plan: Extract<CakePlan, { mode: 'collection' }>, dealt: boolean, picked: number): string {
  if (!dealt) return `Reparteix en ${plan.parts} grups iguals`
  const size = groupSize(plan.total, plan.parts)
  const missing = plan.selected - picked
  if (picked === 0) return `Toca ${plan.selected} ${groupWord(plan.selected)} per ${plan.selected === 1 ? 'pintar-lo' : 'pintar-los'}`
  if (missing > 0) return `Toca ${missing} ${groupWord(missing)} més`
  if (missing < 0) return `Has pintat ${picked} ${groupWord(picked)}: en volem ${plan.selected}`
  return `${picked} ${groupWord(picked)} de ${size} = ${picked * size}`
}

/** Live caption of a whole cake while counting the painted slices. */
export function wholeCaption(parts: number, counted: number): string {
  return counted === 0 ? 'Toca els trossos pintats per comptar-los' : `${counted} de ${parts} trossos`
}

/** Adds the index if missing, removes it if present; always a new sorted array. */
export function toggleIndex(list: readonly number[], index: number): number[] {
  return list.includes(index) ? list.filter((i) => i !== index) : [...list, index].sort((a, b) => a - b)
}
