import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { basketFromItem, basketRequest, type BasketTask as BasketModel } from './basketLogic'
import { BasketTask } from './BasketTask'
import { payFromItem, payRequest, type PayTask as PayModel } from './payLogic'
import { PayTask } from './PayTask'

export const basketAdapter: ErrandAdapter<BasketModel> = {
  id: 'cistella',
  canAdapt: (item) => basketFromItem(item) !== undefined,
  toTask: (item) => {
    const task = basketFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer amb la cistella`)
    return task
  },
  request: (task) => basketRequest(task),
  Component: BasketTask,
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
  Component: PayTask,
}

/** Order matters: the first adapter that takes an item plays it; the rest go to the price-tag fallback. */
export const BOTIGA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(payAdapter), erase(basketAdapter)]
