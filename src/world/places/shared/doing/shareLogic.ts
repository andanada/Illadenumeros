import type { Item } from '../../../../core/ambit/types'
import { planFromItem } from '../../../../games/llaminadures/plateLogic'

export type ShareAsk = 'quotient' | 'remainder' | 'part'

export interface ShareTask {
  readonly total: number
  readonly groups: number
  readonly ask: ShareAsk
  /** ask 'part': how many of the groups are the answer (¾ of 12: three of four groups). */
  readonly take?: number
}

/** Most groups / things the world lays out with the hands; bigger sharings go to the sheet. */
export const MAX_GROUPS = 10
export const MAX_TOTAL = 40

/** A sharing item (reuses the Llaminadures planner) that fits the world, else undefined. */
export function shareFromItem(item: Item): ShareTask | undefined {
  const plan = planFromItem(item)
  if (plan.mode !== 'deal' || plan.groups > MAX_GROUPS || plan.total > MAX_TOTAL) return undefined
  return { total: plan.total, groups: plan.groups, ask: plan.ask }
}

/** «¾ de 12» (a fraction of a collection): share in `parts` groups, the answer is what `selected` of them hold. */
export function partFromItem(item: Item): ShareTask | undefined {
  const v = item.hintVisual
  if (v.kind !== 'fraction' || v.collection === undefined || item.skillId === 'E9') return undefined
  if (v.parts < 2 || v.parts > MAX_GROUPS || v.collection > MAX_TOTAL || v.collection % v.parts !== 0 || v.selected < 1 || v.selected > v.parts) return undefined
  return { total: v.collection, groups: v.parts, ask: 'part', take: v.selected }
}

const even = (counts: readonly number[]): boolean => counts.every((n) => n === counts[0])

/** Sharing is done when every group holds the same and fewer things are left than groups. */
export const shareFinished = (counts: readonly number[], left: number): boolean => counts.length > 0 && even(counts) && left < counts.length

/** What she answers: the share each group got, or what is left over. undefined while not finished. */
export function shareAnswer(counts: readonly number[], left: number, ask: ShareAsk, take = 1): number | undefined {
  if (!shareFinished(counts, left)) return undefined
  if (ask === 'part') return counts.slice(0, take).reduce((a, b) => a + b, 0)
  return ask === 'quotient' ? (counts[0] ?? 0) : left
}

/** Live words under the groups. They guide the dealing without giving the numbers away. */
export function shareCaption(counts: readonly number[], left: number, groups: number): string {
  if (counts.reduce((a, b) => a + b, 0) === 0) return `Reparteix-ho en ${groups} parts, igual per a tothom.`
  if (shareFinished(counts, left)) return left === 0 ? 'Tot repartit! Comprova-ho.' : 'Ja no es pot repartir més! Comprova-ho.'
  if (!even(counts)) return 'Cadascú ha de tenir el mateix: mira qui en té menys.'
  return 'Continua repartint, una a cadascú.'
}
