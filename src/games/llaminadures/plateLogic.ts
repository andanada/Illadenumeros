import type { Item } from '../../core/ambit/types'

export const MAX_PLATES = 10
export const MIN_PLATES = 2
export const MAX_CANDIES = 40

export type SharePlan =
  | { mode: 'deal'; total: number; groups: number; ask: 'quotient' | 'remainder' }
  | { mode: 'plain' }

/** What the question asks for: the remainder when the text talks about leftovers ("sobren"), else the quotient. */
export function askFromText(text: string): 'quotient' | 'remainder' {
  return /sobr|residu/i.test(text) ? 'remainder' : 'quotient'
}

/** Decides how to play an item: dealing candies onto plates, or plain choices with the visual. */
export function planFromItem(item: Item): SharePlan {
  const candidates: { total: number; groups: number }[] = []
  for (const visual of [item.visual, item.hintVisual]) {
    if (visual.kind === 'share') candidates.push({ total: visual.total, groups: visual.groups })
  }
  const ops = item.operands
  // Grouping problems ("posa 12 en caixes de 3") draw one plate per box: dealing would be misleading, keep them as plain.
  const share = item.visual.kind === 'share' ? item.visual : undefined
  if (ops && ops.op === ':' && share && share.groups !== ops.b) return { mode: 'plain' }
  if (ops && ops.op === ':') candidates.push({ total: ops.a, groups: ops.b })
  const found = candidates.find((c) => c.groups >= MIN_PLATES && c.groups <= MAX_PLATES && c.total >= 1 && c.total <= MAX_CANDIES)
  return found ? { mode: 'deal', ...found, ask: askFromText(item.text) } : { mode: 'plain' }
}

export const emptyPlates = (groups: number): number[] => Array.from({ length: groups }, () => 0)

export const dealtTotal = (plates: readonly number[]): number => plates.reduce((n, p) => n + p, 0)

/** Fairness: a plate may only receive a candy while it has the fewest ("un a cada plat"). */
export function canDeal(plates: readonly number[], index: number): boolean {
  const own = plates[index]
  return own !== undefined && own === Math.min(...plates)
}

/** First plate (left to right) that can receive a candy. */
export function nextPlate(plates: readonly number[]): number {
  return plates.indexOf(Math.min(...plates))
}

/** Gives one candy to a plate (immutably). Returns the same array when the move is not allowed. */
export function dealTo(plates: readonly number[], index: number, total: number): readonly number[] {
  if (!canDeal(plates, index) || isShared(plates, total)) return plates
  return plates.map((n, i) => (i === index ? n + 1 : n))
}

/** Candies left in the pool. */
export const remainingCandies = (plates: readonly number[], total: number): number => Math.max(0, total - dealtTotal(plates))

/** Sharing is finished when every plate has the same and fewer candies are left than plates: the rest "sobren". */
export function isShared(plates: readonly number[], total: number): boolean {
  const even = plates.every((n) => n === plates[0])
  return even && remainingCandies(plates, total) < plates.length
}

/** Plates fully dealt for the end state (used for pictorial stage and solutions). */
export function fullPlates(total: number, groups: number): number[] {
  return emptyPlates(groups).map(() => Math.floor(total / groups))
}

export function dealCaption(plates: readonly number[], total: number): string {
  const left = remainingCandies(plates, total)
  if (isShared(plates, total)) return left === 0 ? 'Tot repartit! No en sobra cap' : `Tot repartit! En sobren ${left}`
  return `Et queden ${left} per repartir`
}
