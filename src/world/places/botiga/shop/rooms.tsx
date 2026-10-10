import type { Block } from '../../../sandbox/logic/walkPlan'
import type { StartItem } from '../../../sandbox/ItemsContext'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import { BackRoomBackdrop, BayBackdrop, ColdRoomBackdrop, ShopFloorBackdrop } from './shopArt'
import type { SlotDef } from './shopLogic'

export interface ShopRoom {
  readonly id: string
  readonly label: string
  readonly floorTop: number
  readonly backdrop: React.ReactNode
  readonly blocks: readonly Block[]
  readonly seats: readonly SeatDef[]
  readonly doors: readonly DoorDef[]
  readonly surfaces: readonly SurfaceDef[]
}

/** Room ids. `fora` is the street: customers who are not in the shop are there (never drawn). */
export const ROOM = { floor: 'botiga', back: 'rebotiga', cold: 'fred', bay: 'moll', street: 'fora' } as const

const SHELF_ROWS = [0.21, 0.32, 0.43] as const
const SHELF_XS = [0.17, 0.25, 0.33, 0.41, 0.49] as const

export const SHELF_SLOTS: readonly SlotDef[] = SHELF_ROWS.flatMap((y, r) => SHELF_XS.map((x, c) => ({ id: `prestatge-${r + 1}-${c + 1}`, at: { x, y } })))

const SHELF_NAMES = ['el prestatge de dalt', 'el prestatge del mig', 'el prestatge de baix']
const shelfSurfaces: readonly SurfaceDef[] = SHELF_SLOTS.map((s, i) => ({
  id: s.id,
  label: `${SHELF_NAMES[Math.floor(i / SHELF_XS.length)] ?? 'el prestatge'}, lloc ${(i % SHELF_XS.length) + 1}`,
  at: s.at,
  stand: { x: s.at.x, y: 0.52 },
}))

export const TILL_AT = { x: 0.63, y: 0.545 } as const
export const SCALE_AT = { x: 0.76, y: 0.545 } as const
/** Where customers stand to ask, at the front of the counter. */
export const COUNTER_SPOTS = [
  { id: 'taulell-1', at: { x: 0.62, y: 0.74 } },
  { id: 'taulell-2', at: { x: 0.8, y: 0.74 } },
] as const
/** The shop door to the street (customers go in and out through it). */
export const STREET_DOOR = { x: 0.05, y: 0.6 } as const

const counterSurfaces: readonly SurfaceDef[] = [
  { id: 'caixa-1', label: 'la caixa registradora', at: { x: 0.6, y: 0.545 }, stand: { x: 0.62, y: 0.7 } },
  { id: 'caixa-2', label: 'la caixa registradora (dreta)', at: { x: 0.66, y: 0.545 }, stand: { x: 0.66, y: 0.7 } },
  { id: 'bascula-1', label: 'la bàscula', at: { x: 0.73, y: 0.545 }, stand: { x: 0.73, y: 0.7 } },
  { id: 'bascula-2', label: 'la bàscula (dreta)', at: { x: 0.79, y: 0.545 }, stand: { x: 0.79, y: 0.7 } },
]

const door = (to: string, at: { x: number; y: number }, label: string, arrive: { x: number; y: number }): DoorDef => ({ id: `porta-${to}`, label, at, to, arrive, box: { w: 0.075, h: 0.3 } })

export const ROOMS: Readonly<Record<string, ShopRoom>> = {
  [ROOM.floor]: {
    id: ROOM.floor,
    label: 'La botiga',
    floorTop: 0.46,
    backdrop: <ShopFloorBackdrop />,
    blocks: [{ x: 0.56, y: 0.5, w: 0.32, h: 0.15 }],
    seats: [{ id: 'taulell-gat', label: 'el taulell', at: { x: 0.69, y: 0.54 }, facing: 1 }],
    doors: [door(ROOM.back, { x: 0.95, y: 0.6 }, 'Porta de la trastienda', { x: 0.14, y: 0.64 }), door(ROOM.street, STREET_DOOR, 'Porta del carrer', { x: 0.5, y: 0.7 })],
    surfaces: [...shelfSurfaces, ...counterSurfaces],
  },
  [ROOM.back]: {
    id: ROOM.back,
    label: 'La trastienda',
    floorTop: 0.46,
    backdrop: <BackRoomBackdrop />,
    blocks: [{ x: 0.2, y: 0.4, w: 0.3, h: 0.12 }],
    seats: [],
    doors: [
      door(ROOM.floor, { x: 0.05, y: 0.6 }, 'Porta de la botiga', { x: 0.88, y: 0.64 }),
      door(ROOM.cold, { x: 0.95, y: 0.6 }, 'Porta de la cambra del fred', { x: 0.14, y: 0.64 }),
      door(ROOM.bay, { x: 0.5, y: 0.56 }, 'Escala cap al moll de càrrega', { x: 0.14, y: 0.72 }),
    ],
    surfaces: [{ id: 'taula-paquets', label: 'la taula de la trastienda', at: { x: 0.74, y: 0.58 }, stand: { x: 0.74, y: 0.72 } }],
  },
  [ROOM.cold]: {
    id: ROOM.cold,
    label: 'La cambra del fred',
    floorTop: 0.46,
    backdrop: <ColdRoomBackdrop />,
    blocks: [],
    seats: [],
    doors: [door(ROOM.back, { x: 0.05, y: 0.6 }, 'Porta de la trastienda', { x: 0.88, y: 0.64 })],
    surfaces: [{ id: 'terra-fred', label: 'el terra del fred', at: { x: 0.7, y: 0.74 }, stand: { x: 0.7, y: 0.8 } }],
  },
  [ROOM.bay]: {
    id: ROOM.bay,
    label: 'El moll de càrrega',
    floorTop: 0.46,
    backdrop: <BayBackdrop />,
    blocks: [{ x: 0.4, y: 0.46, w: 0.34, h: 0.18 }],
    seats: [],
    doors: [door(ROOM.back, { x: 0.05, y: 0.6 }, 'Escala cap a la trastienda', { x: 0.5, y: 0.66 })],
    surfaces: [{ id: 'moll-terra', label: 'el moll', at: { x: 0.3, y: 0.78 }, stand: { x: 0.3, y: 0.84 } }],
  },
}

const f = (uid: string, def: string, room: string, x: number, y: number): StartItem => ({ uid, def, room, at: { x, y } })
const inside = (uid: string, def: string, box: string): StartItem => ({ uid, def, room: ROOM.back, at: { x: 0, y: 0 }, inside: box })
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'] as const

export const SHOP_START: readonly StartItem[] = [
  f('bascula', 'bascula', ROOM.floor, 0.76, 0.545),
  f('pa-1', 'barra-pa', ROOM.floor, 0.17, 0.21),
  f('pa-2', 'barra-pa', ROOM.floor, 0.25, 0.21),
  f('poma-s1', 'poma', ROOM.floor, 0.17, 0.32),
  f('caixa-pomes', 'caixa-pomes', ROOM.back, 0.8, 0.84),
  ...LETTERS.slice(0, 8).map((n) => inside(`poma-${n}`, 'poma', 'caixa-pomes')),
  f('caixa-fruita', 'caixa-fruita', ROOM.back, 0.66, 0.92),
  ...LETTERS.slice(0, 3).map((n) => inside(`platan-${n}`, 'platan', 'caixa-fruita')),
  ...LETTERS.slice(0, 3).map((n) => inside(`taronja-${n}`, 'taronja', 'caixa-fruita')),
  ...LETTERS.slice(0, 1).map((n) => inside(`croissant-${n}`, 'croissant', 'caixa-fruita')),
  f('caixa-fred', 'caixa-fred', ROOM.cold, 0.5, 0.78),
  ...LETTERS.slice(0, 4).map((n) => inside(`llet-${n}`, 'llet', 'caixa-fred')),
  f('paquet-1', 'paquet', ROOM.bay, 0.3, 0.8),
  f('paquet-2', 'paquet', ROOM.bay, 0.2, 0.86),
  f('ou-sorpresa', 'ou-sorpresa', ROOM.floor, 0.5, 0.86),
  f('pilota', 'pilota', ROOM.floor, 0.3, 0.9),
]
