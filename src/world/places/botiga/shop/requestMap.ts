import type { Item } from '../../../../core/ambit/types'
import { basketFromItem } from '../errands/basketLogic'
import { payFromItem } from '../errands/payLogic'

/** What the bubble over a customer shows: a picture (prop id) and a number. */
export interface BubbleView {
  readonly icon: string
  readonly number?: number | string
}

/**
 * The bubble of the item the customer wants played: the goods and the sum to do («7+5», «12−5»), a coin for the
 * change, or a price tag. Never the answer: the number is the question.
 */
export function bubbleOf(item: Item): BubbleView {
  if (payFromItem(item)) return { icon: 'moneda-poble' }
  const basket = basketFromItem(item)
  if (!basket) return { icon: 'etiqueta-preu' }
  const number = basket.mode === 'sum' ? `${basket.a}+${basket.b}` : basket.mode === 'missing' ? `${basket.a}+?` : `${basket.a}−${basket.b}`
  return { icon: basket.product.id, number }
}

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)

/**
 * Which of the shop's customers carries a request made for `actorId`. The named neighbour comes themselves
 * when they are among the customers; otherwise (the shopkeeper, someone from another place) a customer is
 * chosen by the request id, so it is stable.
 */
export function carrierFor(actorId: string, requestId: string, customers: readonly string[]): string | undefined {
  if (customers.includes(actorId)) return actorId
  return customers.length === 0 ? undefined : customers[hash(requestId) % customers.length]
}
