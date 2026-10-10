import type { Item } from '../../../../core/ambit/types'
import { partFromItem, shareFromItem } from '../../shared/doing/shareLogic'
import { cutFromItem, cutWords } from '../pizza/cutLogic'
import type { PizzeriaMode } from '../shop/zones'

/** How a pizzeria item is played: dealt onto plates, or cut and handed over; undefined = price tags in the card. */
export type PizzeriaPlay = { readonly mode: PizzeriaMode } | undefined

export function playOf(item: Item): PizzeriaPlay {
  const cut = cutFromItem(item)
  if (cut) return { mode: { kind: 'cut', parts: cut.parts, selected: cut.selected } }
  const part = partFromItem(item)
  if (part) return { mode: { kind: 'share', task: part } }
  const share = shareFromItem(item)
  if (share) return { mode: { kind: 'share', task: share } }
  return undefined
}

/** What the customer says (Catalan). Never the answer. */
export function wordsOf(play: NonNullable<PizzeriaPlay>): { text: string; speech: string } {
  const { mode } = play
  if (mode.kind === 'cut') {
    const text = cutWords({ parts: mode.parts, selected: mode.selected }, 'a la clienta')
    return { text, speech: text }
  }
  const { total, groups, ask, take } = mode.task
  const base = `Reparteix ${total} trossos de pizza en ${groups} plats iguals`
  const text =
    ask === 'remainder'
      ? `${base}. Quants en sobren?`
      : ask === 'part'
        ? `Quant és ${take}/${groups} de ${total} trossos? ${base} i compta quants hi ha en ${take} ${take === 1 ? 'plat' : 'plats'}.`
        : `${base}. Quants en toquen a cada plat?`
  return { text, speech: text }
}
