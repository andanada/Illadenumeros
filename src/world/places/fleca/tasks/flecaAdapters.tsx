import { erase } from '../../../errands/adapters'
import type { AnyErrandAdapter, ErrandAdapter } from '../../../errands/types'
import type { Item } from '../../../../core/ambit/types'
import { playOf, wordsOf, type FlecaPlay } from './flecaTasks'

type Play = NonNullable<FlecaPlay>

/** The world does the task in the shop (trays on the floor), so the adapter's own component is never drawn. */
const Nothing = (): null => null

const adapter = (id: string, kind: Play['mode']['kind']): ErrandAdapter<Play> => ({
  id,
  canAdapt: (item: Item) => playOf(item)?.mode.kind === kind,
  toTask: (item) => {
    const play = playOf(item)
    if (!play) throw new Error(`L’ítem ${item.id} no es pot fer a les safates`)
    return play
  },
  request: (task, item) => wordsOf(item, task),
  Component: Nothing,
})

/** Rows × columns on a tray, and sharing onto trays. Anything else is played with the price tags. */
export const FLECA_ADAPTERS: readonly AnyErrandAdapter[] = [erase(adapter('safata', 'array')), erase(adapter('reparteix', 'share'))]
