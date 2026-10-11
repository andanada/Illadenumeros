import type { Item } from '../../../../core/ambit/types'
import { choiceForValue } from '../../../errands/adapters'
import type { Rect } from '../../../sandbox/logic/zones'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { zoneSlots } from '../../shared/doing/pileTask'
import type { PileSpec } from '../../shared/doing/usePileTask'
import { basketValue, solutionCount, type BasketTask } from '../errands/basketLogic'
import { ROOM } from '../shop/rooms'

export const BASKET_ZONE = 'cistella'
export const OFF_ZONE = 'sobrants'

/** People who ask for N things get N + this many in the crate, so she has to count, not just empty it. */
export const SPARE = 2

/**
 * Where things lie. Always side by side, never one above the other: the character stands over whatever she is carrying
 * from or to and covers what lies above her, so the pile and the zone each get their own column, far enough apart that
 * neither her body nor a 64 px touch target of one reaches the other. Narrow screens use wider columns.
 */
interface Geo {
  readonly cols: number
  readonly cellW: number
  readonly rowH: number
  readonly basketX: number
  readonly basketBottom: number
  readonly offX: number
  readonly offBottom: number
  readonly pile: Rect
}
const geoOf = (compact: boolean): Geo =>
  compact
    ? { cols: 5, cellW: 0.084, rowH: 0.056, basketX: 0.56, basketBottom: 0.95, offX: 0.02, offBottom: 0.95, pile: { x: 0.02, y: 0.64, w: 0.36, h: 0.3 } }
    : { cols: 5, cellW: 0.056, rowH: 0.056, basketX: 0.36, basketBottom: 0.95, offX: 0.03, offBottom: 0.95, pile: { x: 0.03, y: 0.66, w: 0.25, h: 0.28 } }

/** The crate spills onto the floor of the shop. */
export const cratePile = (compact = false): Rect => geoOf(compact).pile

/** Def of the product as it is carried in a request (distinct from the shop's own shelf goods). */
export const requestDef = (productId: string): string => `${productId}-peticio`

export interface BasketLayout {
  /** Things she carries in from the crate. */
  readonly loose: number
  readonly slots: number
  readonly offSlots: number
}

/** How many things lie loose, and how big the basket and the sobrants box are for this task. */
export function basketLayout(task: BasketTask, compact = false): BasketLayout {
  const { cols } = geoOf(compact)
  const loose = task.mode === 'sum' ? task.a + task.b + SPARE : task.mode === 'missing' ? task.b + SPARE : 0
  return { loose, slots: zoneSlots(task.start + loose, cols), offSlots: task.mode === 'take' ? zoneSlots(task.start, cols) : 0 }
}

const rectOf = (g: Geo, x: number, bottom: number, slots: number): Rect => {
  const rows = Math.ceil(slots / g.cols)
  return { x, y: bottom - rows * g.rowH, w: g.cols * g.cellW, h: rows * g.rowH }
}

/** The rectangle of the basket on the stage. */
export const basketRect = (task: BasketTask, compact = false): Rect => {
  const g = geoOf(compact)
  return rectOf(g, g.basketX, g.basketBottom, basketLayout(task, compact).slots)
}

/** The rectangle of the box for the ones that are too many (take-away requests only). */
export const offRect = (task: BasketTask, compact = false): Rect => {
  const g = geoOf(compact)
  return rectOf(g, g.offX, g.offBottom, basketLayout(task, compact).offSlots)
}

/** The basket (always) and, when things are taken out, the box for the ones that are too many. Ten-frame rows. */
export function basketZones(task: BasketTask, compact = false): readonly ZoneDef[] {
  const def = requestDef(task.product.id)
  const { slots, offSlots } = basketLayout(task, compact)
  const { cols } = geoOf(compact)
  const basket: ZoneDef = { id: BASKET_ZONE, room: ROOM.floor, rect: basketRect(task, compact), label: 'la cistella', capacity: slots, cols, accepts: (d) => d === def }
  if (offSlots === 0) return [basket]
  const off: ZoneDef = { id: OFF_ZONE, room: ROOM.floor, rect: offRect(task, compact), label: 'la caixa de les que sobren', capacity: offSlots, cols, accepts: (d) => d === def }
  return [basket, off]
}

const times = (def: string, n: number): readonly string[] => Array.from({ length: Math.max(0, n) }, () => def)

/**
 * What the shop lays out for a basket request: the apples she was told she has in the basket, the crate's spill on
 * the floor, the solution for the last try, and how a basket is read: the count, or what she added to the start.
 */
export function basketSpec(task: BasketTask, item: Item, active: boolean, giveTo?: string, compact = false): PileSpec {
  const def = requestDef(task.product.id)
  return {
    zone: BASKET_ZONE,
    room: ROOM.floor,
    pile: cratePile(compact),
    start: times(def, task.start),
    loose: times(def, basketLayout(task, compact).loose),
    solution: times(def, solutionCount(task)),
    active,
    choose: (inZone) => {
      const n = inZone.filter((d) => d === def).length
      // Nothing touched yet: nothing to hand over (unless the basket already is the answer, «7 − 0»).
      const untouched = n === task.start && solutionCount(task) !== task.start
      return untouched || basketValue(task, n) < 0 ? undefined : choiceForValue(String(basketValue(task, n)), item)
    },
    ...(giveTo ? { giveTo } : {}),
    gave: (n, to) => `Has donat la cistella amb ${n} ${n === 1 ? task.product.one : task.product.many} ${to}.`,
  }
}

/** Words under the card while she works. They guide the hands and never give a number away. */
export function basketCaption(task: BasketTask, touched: boolean): string {
  const them = task.product.many
  if (task.mode === 'take') return touched ? 'Quan hagis acabat, dóna la cistella.' : 'Treu de la cistella les que sobren i posa-les a la caixa.'
  if (touched) return 'Quan estigui a punt, dóna la cistella.'
  return task.mode === 'sum' ? `Porta ${task.product.gender === 'f' ? 'les' : 'els'} ${them} de la caixa a la cistella.` : 'Afegeix a la cistella les que falten.'
}
