import type { Item } from '../../../../core/ambit/types'
import { clipFromItem, slotsOf, type ClipMode } from '../errands/clipLogic'

/** A customer's clip request played on her head: the clips already worn and the ones to add, on each side. */
export interface ClipPlay {
  readonly mode: ClipMode
  /** What she has to add (the answer). */
  readonly expected: number
  /** Clips already worn, per side («ja porto 4»). */
  readonly worn: { readonly left: number; readonly right: number }
  /** What the customer wants in all. */
  readonly whole: number
  /** What the words ask for on each side when they say so (the two groups of a pair), else undefined. */
  readonly groups: { readonly left: number; readonly right: number } | undefined
}

export const SIDES = ['esq', 'dre'] as const
export type SideId = (typeof SIDES)[number]

export const zoneIdOf = (side: SideId): string => `pinces-${side}`
export const CLIP = 'pinca'
export const WORN = 'pinca-ja'
/** At most ten clips fit on each side of a head. */
export const SIDE_CAPACITY = 10

/** The world version of a clip item, or undefined when it does not fit (the price tags play it then). */
export function clipPlayOf(item: Item): ClipPlay | undefined {
  const task = clipFromItem(item)
  if (!task) return undefined
  const expected = task.mode === 'pair' ? task.a + task.b : task.b
  if (task.mode === 'pair') return { mode: 'pair', expected, worn: { left: 0, right: 0 }, whole: expected, groups: { left: task.a, right: task.b } }
  const worn = slotsOf(task).filter((s) => s.state === 'worn')
  return { mode: 'more', expected, worn: { left: worn.filter((s) => s.side === 'left').length, right: worn.filter((s) => s.side === 'right').length }, whole: task.a + task.b, groups: undefined }
}

export const wornTotal = (p: ClipPlay): number => p.worn.left + p.worn.right
/** What the hands do next, never the number. */
export function clipCaption(play: ClipPlay, count: number): string {
  if (count === 0) return play.mode === 'pair' ? 'Agafa pinces de la caixa i posa-les al cap: una banda i l’altra.' : 'Agafa pinces de la caixa i posa-les al cap.'
  return 'Quan estigui a punt, mira-la al mirall.'
}
