import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { clipFromItem, clipRequest, type ClipTask as ClipModel } from './clipLogic'
import { ClipTask } from './ClipTask'

export const clipAdapter: ErrandAdapter<ClipModel> = {
  id: 'pinces',
  canAdapt: (item) => clipFromItem(item) !== undefined,
  toTask: (item) => {
    const task = clipFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer amb pinces`)
    return task
  },
  request: (task) => clipRequest(task),
  Component: ClipTask,
}

/** Anything the clips cannot play falls back to the answers as tags in the customer's hand. */
export const PERRUQUERIA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(clipAdapter)]
