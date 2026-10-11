import type { Item } from '../../../../core/ambit/types'
import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { prizeFromItem, prizeRequest, type PrizeTask } from './prizeLogic'

const nothing = (): null => null

/**
 * The clerk's prize count is played in the arcade itself (toys from the counter shelf onto the clerk's tray):
 * the adapter only says which items fit and what the clerk says. Items that do not fit (divisions, big numbers)
 * are played with the price tags.
 */
export const prizeAdapter: ErrandAdapter<PrizeTask> = {
  id: 'premis',
  canAdapt: (item) => prizeFromItem(item) !== undefined,
  toTask: (item) => {
    const task = prizeFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer amb premis`)
    return task
  },
  request: (task) => prizeRequest(task),
  Component: nothing,
}

export const RECREATIUS_ADAPTERS: readonly AnyErrandAdapter[] = [erase(prizeAdapter)]

/** The prize task of an item, or undefined when the clerk's request is played with the price tags. */
export const prizeModeOf = (item: Item): PrizeTask | undefined => prizeFromItem(item)
