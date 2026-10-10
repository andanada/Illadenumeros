import type { StartItem } from '../../../sandbox/ItemsContext'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import { PRODUCTS } from '../bake/products'
import { BakehouseBackdrop, FlourBackdrop, ShopBackdrop } from './backdrops'

export interface FlecaRoom {
  readonly id: string
  readonly label: string
  readonly backdrop: React.ReactNode
  readonly blocks: readonly Block[]
  readonly seats: readonly SeatDef[]
  readonly doors: readonly DoorDef[]
  readonly surfaces: readonly SurfaceDef[]
}

/** Room ids. `fora` is the street: customers who are not in the bakery are there (never drawn). */
export const ROOM = { shop: 'taulell', oven: 'obrador', flour: 'farina', street: 'fora' } as const
export const FLOOR_TOP = 0.46
/** Where a customer stands to ask, and where the things to carry for the request lie. */
export const ASK_SPOT = { x: 0.22, y: 0.6 } as const
export const PILE_AT = { x: 0.12, y: 0.74 } as const
export const STREET_DOOR = { x: 0.05, y: 0.6 } as const

const door = (to: string, at: { x: number; y: number }, label: string, arrive: { x: number; y: number }): DoorDef => ({ id: `porta-${to}`, label, at, to, arrive, box: { w: 0.075, h: 0.3 } })
const table = (id: string, label: string, x: number): SurfaceDef => ({ id, label, at: { x, y: 0.56 }, stand: { x, y: 0.82 } })

export const ROOMS: Readonly<Record<string, FlecaRoom>> = {
  [ROOM.shop]: {
    id: ROOM.shop,
    label: 'La botiga de la fleca',
    backdrop: <ShopBackdrop />,
    blocks: [{ x: 0.42, y: 0.5, w: 0.4, h: 0.1 }],
    seats: [],
    doors: [door(ROOM.street, STREET_DOOR, 'Porta del carrer', { x: 0.5, y: 0.7 }), door(ROOM.oven, { x: 0.95, y: 0.6 }, 'Porta de l’obrador', { x: 0.1, y: 0.7 })],
    surfaces: [{ id: 'mostrador', label: 'el mostrador', at: { x: 0.45, y: 0.52 }, stand: { x: 0.45, y: 0.64 } }],
  },
  [ROOM.oven]: {
    id: ROOM.oven,
    label: 'L’obrador',
    backdrop: <BakehouseBackdrop />,
    blocks: [{ x: 0.34, y: 0.66, w: 0.28, h: 0.1 }],
    seats: [],
    doors: [door(ROOM.shop, { x: 0.05, y: 0.6 }, 'Porta de la botiga', { x: 0.88, y: 0.7 }), door(ROOM.flour, { x: 0.95, y: 0.6 }, 'Porta del magatzem de farina', { x: 0.1, y: 0.7 })],
    surfaces: [table('taula-1', 'la taula de treball (esquerra)', 0.4), table('taula-2', 'la taula de treball (mig)', 0.48), table('taula-3', 'la taula de treball (dreta)', 0.56)],
  },
  [ROOM.flour]: {
    id: ROOM.flour,
    label: 'El magatzem de farina',
    backdrop: <FlourBackdrop />,
    blocks: [{ x: 0.52, y: 0.5, w: 0.4, h: 0.1 }],
    seats: [],
    doors: [door(ROOM.oven, { x: 0.05, y: 0.6 }, 'Porta de l’obrador', { x: 0.88, y: 0.7 })],
    surfaces: [{ id: 'terra-farina', label: 'el terra del magatzem', at: { x: 0.3, y: 0.8 }, stand: { x: 0.3, y: 0.86 } }],
  },
}

const inside = (uid: string, def: string): StartItem => ({ uid, def, room: ROOM.flour, at: { x: 0, y: 0 }, inside: 'caixa-massa' })
const item = (uid: string, def: string, room: string, x: number, y: number): StartItem => ({ uid, def, room, at: { x, y } })

export const FLECA_START: readonly StartItem[] = [
  item('caixa-massa', 'caixa-massa', ROOM.flour, 0.66, 0.82),
  ...PRODUCTS.flatMap((p) => ['a', 'b'].map((n) => inside(`${p.raw}-${n}`, p.raw))),
  item('rodet', 'rodet', ROOM.oven, 0.4, 0.56),
  item('modelador', 'modelador', ROOM.oven, 0.48, 0.56),
  item('glassa', 'glassa', ROOM.oven, 0.56, 0.56),
  item('fideus', 'fideus', ROOM.oven, 0.62, 0.56),
  item('magdalena-mostrador', 'magdalena', ROOM.shop, 0.52, 0.52),
  item('croissant-mostrador', 'croissant', ROOM.shop, 0.6, 0.52),
  item('caixa-sorpresa', 'caixa-sorpresa', ROOM.flour, 0.9, 0.9),
]
