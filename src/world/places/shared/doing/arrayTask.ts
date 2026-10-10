import type { Item } from '../../../../core/ambit/types'
import { planFromItem } from '../../../../games/fleca-files/trayLogic'

export interface ArrayTask {
  readonly rows: number
  readonly cols: number
}

/** Most things the world lays out for one array (the hands, the pile and the frame all have to fit). */
export const MAX_WORLD_TRAY = 40
export const MAX_ARRAY_COLS = 10
export const MAX_ARRAY_ROWS = 10

/** A product item that is played as an array of rows × columns (reuses the Fleca de les Files planner). */
export function arrayFromItem(item: Item): ArrayTask | undefined {
  const plan = planFromItem(item)
  if (plan.mode !== 'array' || plan.rows > MAX_ARRAY_ROWS || plan.cols > MAX_ARRAY_COLS) return undefined
  if (plan.rows * plan.cols !== Number(item.answer) || plan.rows * plan.cols > MAX_WORLD_TRAY) return undefined
  return { rows: plan.rows, cols: plan.cols }
}

/** Frame with spare rows (the child has to stop) once the item is no longer in the concrete stage. */
export const spareRows = (item: Item): number => (item.cpaStage === 'concret' ? 0 : 2)
