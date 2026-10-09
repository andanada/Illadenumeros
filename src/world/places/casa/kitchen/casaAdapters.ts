import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { BowlTask } from './BowlTask'
import { bowlFromItem, bowlRequest, type BowlTask as BowlModel } from './kitchenLogic'

export const bowlAdapter: ErrandAdapter<BowlModel> = {
  id: 'bol',
  canAdapt: (item) => bowlFromItem(item) !== undefined,
  toTask: (item) => {
    const task = bowlFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot cuinar al bol`)
    return task
  },
  request: (task) => bowlRequest(task),
  Component: BowlTask,
}

/** The kitchen's errands; anything else is played with the fallback tokens (recipe cards). */
export const CASA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(bowlAdapter)]
