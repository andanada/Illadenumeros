import type { Item } from '../../../../core/ambit/types'
import { formatEuros } from '../../../../ui/visual/moneyLogic'
import { basketFromItem, solutionCount } from '../errands/basketLogic'
import { payFromItem } from '../errands/payLogic'

/** What the bubble over a customer shows: a picture (prop id) and a number. */
export interface BubbleView {
  readonly icon: string
  readonly number?: number | string
}

/** The bubble of the item the customer wants played: apples and a count, a coin and the money, or a price tag. */
export function bubbleOf(item: Item): BubbleView {
  const pay = payFromItem(item)
  if (pay) return { icon: 'moneda-poble', number: formatEuros(pay.target) }
  const basket = basketFromItem(item)
  if (basket) return { icon: basket.product.id, number: solutionCount(basket) }
  return { icon: 'etiqueta-preu' }
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
