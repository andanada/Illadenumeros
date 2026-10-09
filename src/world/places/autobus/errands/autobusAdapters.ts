import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { roadFromItem, roadRequest, type RoadTask as RoadModel } from './roadLogic'
import { RoadTask } from './RoadTask'
import { seatsFromItem, seatsRequest, type SeatsTask as SeatsModel } from './seatsLogic'
import { SeatsTask } from './SeatsTask'

export const seatsAdapter: ErrandAdapter<SeatsModel> = {
  id: 'seients',
  canAdapt: (item) => seatsFromItem(item) !== undefined,
  toTask: (item) => {
    const task = seatsFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer amb els seients`)
    return task
  },
  request: (task) => seatsRequest(task),
  Component: SeatsTask,
}

export const roadAdapter: ErrandAdapter<RoadModel> = {
  id: 'parades',
  canAdapt: (item) => roadFromItem(item) !== undefined,
  toTask: (item) => {
    const task = roadFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot fer a la línia`)
    return task
  },
  request: (task) => roadRequest(task),
  Component: RoadTask,
}

/** Small numbers ride the seats (two ten-frames); bigger ones and the number line drive the road. */
export const AUTOBUS_ADAPTERS: readonly AnyErrandAdapter[] = [erase(seatsAdapter), erase(roadAdapter)]
