import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { basketFromItem, basketRequest, type BasketTask as BasketModel } from './basketLogic'
import { payFromItem, payRequest, type PayTask as PayModel } from './payLogic'

/**
 * The shop's tasks live in the shop itself (apples carried into the basket, coins into the customer's hand): the
 * adapters only say which items can be played that way and what the customer says. The component is never drawn;
 * every other item (big numbers, price tags) is played on the sheet.
 */
const nothing = (): null => null

export const basketAdapter: ErrandAdapter<BasketModel> = {
  id: 'cistella',
  canAdapt: (item) => basketFromItem(item) !== undefined,
  toTask: (item) => {
    const task = basketFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer amb la cistella`)
    return task
  },
  request: (task) => basketRequest(task),
  Component: nothing,
}

export const payAdapter: ErrandAdapter<PayModel> = {
  id: 'canvi',
  canAdapt: (item) => payFromItem(item) !== undefined,
  toTask: (item) => {
    const task = payFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no és de canvi`)
    return task
  },
  request: (_task, item) => payRequest(item),
  Component: nothing,
}

/** Order matters: the first adapter that takes an item plays it; the rest go to the price-tag fallback. */
export const BOTIGA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(payAdapter), erase(basketAdapter)]
