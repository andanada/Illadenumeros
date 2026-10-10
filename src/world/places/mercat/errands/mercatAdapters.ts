import type { Item } from '../../../../core/ambit/types'
import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { scaleFromItem, trayFromItem, trayRequest, type ScaleTask, type TrayTask } from '../market/priceLogic'

/**
 * The market's tasks live in the square itself (bags on the scale, coins on the cashier tray): the adapters only
 * say which items can be played that way and what the stallholder says. The component is never drawn; every other
 * item is played in the market sheet (its picture and the answers as price tags).
 */
const nothing = (): null => null

export const scaleAdapter: ErrandAdapter<ScaleTask> = {
  id: 'bascula',
  canAdapt: (item) => scaleFromItem(item) !== undefined,
  toTask: (item) => {
    const task = scaleFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es pot pesar`)
    return task
  },
  request: (task) => {
    const text = `Vull ${task.kg} kg de pomes! Posa bosses d’una dècima (100 g) a la bàscula fins que marqui ${task.kg} kg. Quantes dècimes hi ha en ${task.kg}?`
    return { text, speech: text }
  },
  Component: nothing,
}

export const trayAdapter: ErrandAdapter<TrayTask> = {
  id: 'safata',
  canAdapt: (item) => trayFromItem(item) !== undefined,
  toTask: (item) => {
    const task = trayFromItem(item)
    if (!task) throw new Error(`L’ítem ${item.id} no es paga amb monedes`)
    return task
  },
  request: (task, item) => trayRequest(task, item.text),
  Component: nothing,
}

export const MERCAT_ADAPTERS: readonly AnyErrandAdapter[] = [erase(scaleAdapter), erase(trayAdapter)]

export type MarketMode = { kind: 'scale'; task: ScaleTask } | { kind: 'tray'; task: TrayTask } | { kind: 'sheet' }

/** How an item is played: bags on the scale, coins on the tray, or the sheet with its picture. */
export function marketModeOf(item: Item): MarketMode {
  const scale = scaleFromItem(item)
  if (scale) return { kind: 'scale', task: scale }
  const tray = trayFromItem(item)
  return tray ? { kind: 'tray', task: tray } : { kind: 'sheet' }
}
