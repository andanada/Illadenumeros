import type { Item } from '../../../../core/ambit/types'
import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { plantFromItem, plantRequest, type PlantTask } from '../garden/plantLogic'
import { shareFromItem, shareRequest, type ShareTask } from '../share/shareLogic'

/**
 * The farm's tasks live in the world itself (seeds on the plot, feed in the bowls), not in a sheet: the
 * adapters only decide which items can be played that way and what the farmer says. The component is never
 * drawn (the place lays the objects out on the stage); items no adapter takes use the price-tag sheet.
 */
const nothing = (): null => null

export const plantAdapter: ErrandAdapter<PlantTask> = {
  id: 'parcel',
  canAdapt: (item) => plantFromItem(item) !== undefined,
  toTask: (item) => {
    const task = plantFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot plantar en files`)
    return task
  },
  request: (task) => plantRequest(task),
  Component: nothing,
}

export const shareAdapter: ErrandAdapter<ShareTask> = {
  id: 'repartir',
  canAdapt: (item) => shareFromItem(item) !== undefined,
  toTask: (item) => {
    const task = shareFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot repartir`)
    return task
  },
  request: (task) => shareRequest(task),
  Component: nothing,
}

export const GRANJA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(plantAdapter), erase(shareAdapter)]

export type FarmMode = { kind: 'plant'; task: PlantTask } | { kind: 'share'; task: ShareTask } | { kind: 'sheet' }

/** How an item is played: sown on the plot, shared into bowls / egg boxes, or with the price-tag sheet. */
export function farmModeOf(item: Item): FarmMode {
  const plant = plantFromItem(item)
  if (plant) return { kind: 'plant', task: plant }
  const share = shareFromItem(item)
  return share ? { kind: 'share', task: share } : { kind: 'sheet' }
}
