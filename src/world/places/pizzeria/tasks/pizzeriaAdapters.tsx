import type { Item } from '../../../../core/ambit/types'
import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import { playOf, wordsOf, type PizzeriaPlay } from './pizzeriaTasks'

type Play = NonNullable<PizzeriaPlay>

/** The world does the task in the rooms (plates, a pizza and its cutter), so the adapter's own component is never drawn. */
const Nothing = (): null => null

const adapter = (id: string, kind: Play['mode']['kind']): ErrandAdapter<Play> => ({
  id,
  canAdapt: (item: Item) => playOf(item)?.mode.kind === kind,
  toTask: (item) => {
    const play = playOf(item)
    if (!play) throw new Error(`L’ítem ${item.id} no es pot fer a la pizzeria`)
    return play
  },
  request: (task) => wordsOf(task),
  Component: Nothing,
})

/** Dealing onto plates and cutting a pizza. Anything else (equivalent fractions, big sharings) is played with price tags. */
export const PIZZERIA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(adapter('plats', 'share')), erase(adapter('talla', 'cut'))]
