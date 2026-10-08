import type { Item } from '../../../../core/ambit/types'
import { isInteger } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'
import { productFor, type Product } from '../products'

/** The basket holds at most two full ten-frames. */
export const BASKET_MAX = 20

/**
 * "Fill the basket" errands:
 * - sum:     a + b = ?   → start empty, put a + b in            → answer = items in the basket
 * - missing: a + ? = t   → start with a, fill up to t           → answer = items added
 * - take:    a − b = ?   → start with a, take b out             → answer = items left
 */
export type BasketMode = 'sum' | 'missing' | 'take'

export interface BasketTask {
  mode: BasketMode
  product: Product
  a: number
  b: number
  /** Items already in the basket when the neighbour arrives. */
  start: number
}

export function basketFromItem(item: Item): BasketTask | undefined {
  const ops = item.operands
  if (!ops || !isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const { a, b, op } = ops
  if (a < 0 || b < 0) return undefined
  const product = productFor(item.id)
  if (op === '+' && answer === a + b && a + b <= BASKET_MAX) return { mode: 'sum', product, a, b, start: 0 }
  if (op === '+' && answer === b && a + b <= BASKET_MAX && item.text.includes('?') && !item.text.trim().endsWith('?')) return { mode: 'missing', product, a, b, start: a }
  if (op === '-' && answer === a - b && a <= BASKET_MAX && b <= a) return { mode: 'take', product, a, b, start: a }
  return undefined
}

/** Value the basket gives as an answer, from the number of items in it. */
export const basketValue = (task: BasketTask, count: number): number => (task.mode === 'sum' || task.mode === 'take' ? count : count - task.start)

/** Items in the basket that answer the item correctly (shown as the solution). */
export const solutionCount = (task: BasketTask): number => (task.mode === 'sum' ? task.a + task.b : task.mode === 'missing' ? task.a + task.b : task.a - task.b)

/** One more in (never above the max) / one out (never below zero). Pure. */
export const addOne = (count: number): number => Math.min(BASKET_MAX, count + 1)
export const takeOne = (count: number): number => Math.max(0, count - 1)

export function basketRequest(task: BasketTask): { text: string; speech: string } {
  const { product: p, a, b } = task
  const them = p.gender === 'f' ? 'Posa-les' : 'Posa’ls'
  switch (task.mode) {
    case 'sum':
      return { text: `Vull ${a} + ${b} ${p.many}! ${them} a la cistella.`, speech: `Vull ${a} més ${b} ${p.many}! ${them} a la cistella.` }
    case 'missing': {
      const t = a + b
      return { text: `Tinc ${countWord(a, p.one, p.many)}, però en vull ${t}: ${a} + ? = ${t}. Posa les que falten!`, speech: `Tinc ${countWord(a, p.one, p.many)}, però en vull ${t}. Posa les que falten!` }
    }
    case 'take':
      return { text: `${a} − ${b}: tinc ${countWord(a, p.one, p.many)} i me’n sobren ${b}. Treu-ne ${b} de la cistella!`, speech: `${a} menys ${b}: tinc ${countWord(a, p.one, p.many)} i me’n sobren ${b}. Treu-ne ${b} de la cistella!` }
  }
}

