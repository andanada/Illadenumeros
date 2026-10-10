import type { Item } from '../../../../core/ambit/types'
import { arrayFromItem, spareRows } from '../../shared/doing/arrayTask'
import { shareFromItem } from '../../shared/doing/shareLogic'
import { productFor, type Product } from '../bake/products'
import type { FlecaMode } from '../shop/zones'

/** How a bakery item is played: laid out on the trays in the shop, or (when it does not fit) with the price tags. */
export type FlecaPlay = { readonly mode: FlecaMode; readonly product: Product } | undefined

export function playOf(item: Item): FlecaPlay {
  const product = productFor(item.id)
  const array = arrayFromItem(item)
  if (array) return { product, mode: { kind: 'array', rows: array.rows, cols: array.cols, extraRows: spareRows(item), product: product.id } }
  const share = shareFromItem(item)
  if (share) return { product, mode: { kind: 'share', task: share, product: product.id } }
  return undefined
}

const caixes = (n: number): string => (n === 1 ? 'caixa' : 'caixes')

/** What the customer says (Catalan). Never the answer. */
export function wordsOf(item: Item, play: NonNullable<FlecaPlay>): { text: string; speech: string } {
  const { mode, product } = play
  if (mode.kind === 'array') {
    const text = `Vull ${mode.rows} ${caixes(mode.rows)} de ${mode.cols} ${mode.cols === 1 ? product.one : product.many}. Posa-les a la safata en files.`
    return { text, speech: text }
  }
  const { total, groups, ask } = mode.task
  const base = `Reparteix ${total} ${product.many} en ${groups} safates iguals`
  const text = ask === 'remainder' ? `${base}. Quantes en sobren?` : ask === 'part' ? `${base} i digues-me què hi ha.` : `${base}. Quantes en toquen a cada safata?`
  void item
  return { text, speech: text }
}
