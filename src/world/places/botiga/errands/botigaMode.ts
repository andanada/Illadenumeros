import type { Item } from '../../../../core/ambit/types'
import { basketFromItem, type BasketTask } from './basketLogic'
import { payFromItem, type PayTask } from './payLogic'

/**
 * How a request is played in the shop:
 * - basket: apples (or bananas…) carried from the crate into the basket, or taken out of it;
 * - change: coins carried from the till drawer into the customer's hand;
 * - sheet: everything else (big numbers, the price tags), on the sheet.
 */
export type BotigaMode = { readonly kind: 'basket'; readonly task: BasketTask } | { readonly kind: 'change'; readonly task: PayTask } | { readonly kind: 'sheet' }

export function botigaModeOf(item: Item): BotigaMode {
  const pay = payFromItem(item)
  if (pay) return { kind: 'change', task: pay }
  const basket = basketFromItem(item)
  return basket ? { kind: 'basket', task: basket } : { kind: 'sheet' }
}
