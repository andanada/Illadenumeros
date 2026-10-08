import type { CpaStage, Item } from '../../../core/ambit/types'

/** A table fact read from an item: `a` groups of `b` (a × b = product) or its inverse division. */
export type TableFact =
  | { readonly kind: 'mul'; readonly a: number; readonly b: number; readonly product: number }
  | { readonly kind: 'div'; readonly dividend: number; readonly divisor: number; readonly quotient: number }

export type Level = 1 | 2 | 3

/** Reads the operands of a multiplication or exact-division item (undefined for anything else). */
export function tableFactOf(item: Item): TableFact | undefined {
  const ops = item.operands
  if (!ops) return undefined
  if (ops.op === '×') return { kind: 'mul', a: ops.a, b: ops.b, product: ops.a * ops.b }
  if (ops.op === ':' && ops.b > 0 && ops.a % ops.b === 0) return { kind: 'div', dividend: ops.a, divisor: ops.b, quotient: ops.a / ops.b }
  return undefined
}

/** Facts with 0 or 1 have nothing to count: the games show them as a plain question. */
export function isTrivial(fact: TableFact): boolean {
  return fact.kind === 'mul' ? fact.a < 2 || fact.b < 2 : fact.dividend === 0 || fact.divisor < 2
}

/** Number of groups and size of each group for the fact (mul: a groups of b; div: quotient groups of divisor). */
export function groupsOf(fact: TableFact): { groups: number; size: number; total: number } {
  return fact.kind === 'mul'
    ? { groups: fact.a, size: fact.b, total: fact.product }
    : { groups: fact.quotient, size: fact.divisor, total: fact.dividend }
}

/** Difficulty level from the learner's stage with the skill (concret → 1 ... abstracte → 3). */
export function levelOf(stage: CpaStage): Level {
  return stage === 'concret' ? 1 : stage === 'pictoric' ? 2 : 3
}

/** The first `count` multiples of `n`: n, 2n, 3n ... */
export const multiples = (n: number, count: number): number[] => Array.from({ length: Math.max(0, count) }, (_, i) => n * (i + 1))

/** "4 + 4 + 4" for repeated addition. */
export const repeatedSum = (size: number, groups: number): string => Array.from({ length: groups }, () => String(size)).join(' + ')
