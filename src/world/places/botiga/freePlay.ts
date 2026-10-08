import { formatEuros } from '../../../ui/visual/moneyLogic'
import { productById } from './products'

/** Free play in the shop (no coins: only errands give coins). Pure state helpers. */

/** A product id of the shop (see products.ts). */
type ProductId = string

export const SHELF_IDS = ['prestatge-dalt', 'prestatge-mig', 'prestatge-baix'] as const
export type ShelfId = (typeof SHELF_IDS)[number]
export const SHELF_CAPACITY = 5

export const SHELF_NAMES: Readonly<Record<ShelfId, string>> = {
  'prestatge-dalt': 'el prestatge de dalt',
  'prestatge-mig': 'el prestatge del mig',
  'prestatge-baix': 'el prestatge de baix',
}

export interface ShopState {
  shelves: Readonly<Record<ShelfId, readonly ProductId[]>>
  /** Delivery box: what is still to be put on the shelves. */
  delivery: readonly ProductId[]
  /** Things rung up on the till. */
  till: readonly ProductId[]
  fridgeOpen: boolean
  cat: 'sleep' | 'awake' | 'stretch'
}

export const initialShop = (): ShopState => ({
  shelves: { 'prestatge-dalt': ['barra-pa', 'barra-pa'], 'prestatge-mig': ['poma'], 'prestatge-baix': [] },
  delivery: ['poma', 'platan', 'platan', 'taronja', 'croissant', 'llet', 'croissant', 'taronja'],
  till: [],
  fridgeOpen: false,
  cat: 'sleep',
})

export const shelfHasRoom = (state: ShopState, shelf: ShelfId): boolean => state.shelves[shelf].length < SHELF_CAPACITY

/** Moves one product from the delivery box to a shelf (unchanged if the shelf is full or the box lacks it). */
export function restock(state: ShopState, shelf: ShelfId, product: ProductId): ShopState {
  const index = state.delivery.indexOf(product)
  if (index < 0 || !shelfHasRoom(state, shelf)) return state
  return {
    ...state,
    delivery: state.delivery.filter((_, i) => i !== index),
    shelves: { ...state.shelves, [shelf]: [...state.shelves[shelf], product] },
  }
}

/** Takes a product off a shelf onto the till (a pretend sale). */
export function ringUp(state: ShopState, shelf: ShelfId, index: number): ShopState {
  const product = state.shelves[shelf][index]
  if (product === undefined) return state
  return {
    ...state,
    shelves: { ...state.shelves, [shelf]: state.shelves[shelf].filter((_, i) => i !== index) },
    till: [...state.till, product],
  }
}

/** Empties the till: the sold things go back to the delivery box so play never runs out. */
export const clearTill = (state: ShopState): ShopState => ({ ...state, delivery: [...state.delivery, ...state.till], till: [] })

export const tillTotal = (state: ShopState): number => state.till.reduce((sum, id) => sum + (productById(id)?.price ?? 0), 0)

export const tillDisplay = (state: ShopState): string => formatEuros(tillTotal(state))

export const toggleFridge = (state: ShopState): ShopState => ({ ...state, fridgeOpen: !state.fridgeOpen })

const CAT_NEXT = { sleep: 'awake', awake: 'stretch', stretch: 'sleep' } as const
export const petCat = (state: ShopState): ShopState => ({ ...state, cat: CAT_NEXT[state.cat] })

/** Prop kinds used by the free-play zones. */
export const deliveryKind = (product: ProductId): string => `entrega:${product}`
export const shelfKind = (shelf: ShelfId, index: number, product: ProductId): string => `prestatge:${shelf}:${index}:${product}`

export function parseKind(kind: string): { from: 'entrega'; product: ProductId } | { from: 'prestatge'; shelf: ShelfId; index: number } | undefined {
  const [from, a, b] = kind.split(':')
  if (from === 'entrega' && a && productById(a)) return { from, product: a }
  if (from === 'prestatge' && (SHELF_IDS as readonly string[]).includes(a ?? '') && b !== undefined) return { from, shelf: a as ShelfId, index: Number(b) }
  return undefined
}
