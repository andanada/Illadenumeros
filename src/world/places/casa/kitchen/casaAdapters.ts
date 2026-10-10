import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { BowlTask } from './BowlTask'
import { THEME_INGREDIENTS, type ThemeId } from './ingredients'
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

/** The bowl with another thing to count (towels, kibble): same task logic, other ingredient and words. */
export function themedAdapters(theme: ThemeId): readonly AnyErrandAdapter[] {
  const ingredient = THEME_INGREDIENTS[theme]
  const themed: ErrandAdapter<BowlModel> = {
    ...bowlAdapter,
    id: `bol-${theme}`,
    toTask: (item) => ({ ...bowlAdapter.toTask(item), ingredient }),
  }
  return [erase(themed)]
}
