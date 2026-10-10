import type { Item } from '../../../../core/ambit/types'
import { clipFromItem, clipSolution } from '../errands/clipLogic'

/** What the bubble over a customer shows: clips and how many, or a price tag when the clips cannot play the item. */
export interface Wish {
  readonly clips: boolean
  readonly number?: number
}

export function wishOf(item: Item): Wish {
  const task = clipFromItem(item)
  return task ? { clips: true, number: clipSolution(task) } : { clips: false }
}
