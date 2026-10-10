import type { StartItem } from '../../../sandbox/ItemsContext'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import { CUTS } from '../pizza/cutLogic'
import { DiningBackdrop, KitchenBackdrop, TerraceBackdrop } from './backdrops'

export interface PizzeriaRoom {
  readonly id: string
  readonly label: string
  readonly backdrop: React.ReactNode
  readonly blocks: readonly Block[]
  readonly seats: readonly SeatDef[]
  readonly doors: readonly DoorDef[]
  readonly surfaces: readonly SurfaceDef[]
}

/** Room ids. `fora` is the street: customers who are not in the pizzeria are there (never drawn). */
export const ROOM = { kitchen: 'cuina', dining: 'sala', terrace: 'terrassa', street: 'fora' } as const
export const FLOOR_TOP = 0.46
export const ASK_SPOT = { x: 0.22, y: 0.6 } as const
export const PILE_AT = { x: 0.12, y: 0.74 } as const
export const PIZZA_AT = { x: 0.5, y: 0.7 } as const
export const STREET_DOOR = { x: 0.05, y: 0.6 } as const

const door = (to: string, at: { x: number; y: number }, label: string, arrive: { x: number; y: number }): DoorDef => ({ id: `porta-${to}`, label, at, to, arrive, box: { w: 0.075, h: 0.3 } })
const table = (id: string, label: string, x: number, y: number): SurfaceDef => ({ id, label, at: { x, y }, stand: { x, y: Math.min(0.9, y + 0.12) } })

export const ROOMS: Readonly<Record<string, PizzeriaRoom>> = {
  [ROOM.dining]: {
    id: ROOM.dining,
    label: 'La sala del restaurant',
    backdrop: <DiningBackdrop />,
    blocks: [{ x: 0.76, y: 0.5, w: 0.2, h: 0.08 }],
    seats: [
      { id: 'cadira-1', label: 'la cadira de la taula 1', at: { x: 0.31, y: 0.84 }, facing: 1 },
      { id: 'cadira-2', label: 'la cadira de la taula 2', at: { x: 0.69, y: 0.84 }, facing: -1 },
    ],
    doors: [door(ROOM.street, STREET_DOOR, 'Porta del carrer', { x: 0.5, y: 0.7 }), door(ROOM.kitchen, { x: 0.95, y: 0.6 }, 'Porta de la cuina', { x: 0.1, y: 0.7 }), door(ROOM.terrace, { x: 0.5, y: 0.55 }, 'Porta de la terrassa', { x: 0.12, y: 0.72 })],
    surfaces: [table('taula-1', 'la taula 1', 0.38, 0.72), table('taula-2', 'la taula 2', 0.62, 0.72), { id: 'barra', label: 'la barra', at: { x: 0.78, y: 0.5 }, stand: { x: 0.78, y: 0.62 } }],
  },
  [ROOM.kitchen]: {
    id: ROOM.kitchen,
    label: 'La cuina',
    backdrop: <KitchenBackdrop />,
    blocks: [{ x: 0.32, y: 0.68, w: 0.28, h: 0.08 }],
    seats: [],
    doors: [door(ROOM.dining, { x: 0.05, y: 0.6 }, 'Porta de la sala', { x: 0.88, y: 0.7 })],
    surfaces: [table('mostrador-1', 'la taula d’acer (esquerra)', 0.38, 0.62), table('mostrador-2', 'la taula d’acer (mig)', 0.46, 0.62), table('mostrador-3', 'la taula d’acer (dreta)', 0.54, 0.62)],
  },
  [ROOM.terrace]: {
    id: ROOM.terrace,
    label: 'La terrassa i la moto de repartiment',
    backdrop: <TerraceBackdrop />,
    blocks: [{ x: 0.52, y: 0.5, w: 0.26, h: 0.18 }],
    seats: [],
    doors: [door(ROOM.dining, { x: 0.05, y: 0.6 }, 'Porta de la sala', { x: 0.5, y: 0.66 })],
    surfaces: [{ id: 'vorera', label: 'la vorera', at: { x: 0.3, y: 0.8 }, stand: { x: 0.3, y: 0.86 } }],
  },
}

const item = (uid: string, def: string, room: string, x: number, y: number): StartItem => ({ uid, def, room, at: { x, y } })
const inBin = (uid: string): StartItem => ({ uid, def: 'massa-pizza', room: ROOM.kitchen, at: { x: 0, y: 0 }, inside: 'pastera' })

export const PIZZERIA_START: readonly StartItem[] = [
  item('pastera', 'pastera', ROOM.kitchen, 0.9, 0.8),
  ...['a', 'b', 'c', 'd'].map((n) => inBin(`massa-${n}`)),
  item('corro', 'corro', ROOM.kitchen, 0.36, 0.62),
  item('salsa', 'salsa', ROOM.kitchen, 0.42, 0.62),
  item('formatge', 'formatge', ROOM.kitchen, 0.48, 0.62),
  item('pepperoni', 'pepperoni', ROOM.kitchen, 0.54, 0.62),
  ...CUTS.map((n, i) => item(`tallador-${n}`, `tallador-${n}`, ROOM.kitchen, 0.3 + i * 0.07, 0.94)),
  item('caixa-pizza-1', 'caixa-pizza', ROOM.kitchen, 0.76, 0.94),
  item('caixa-pizza-2', 'caixa-pizza', ROOM.dining, 0.8, 0.5),
  item('moneda-1', 'moneda', ROOM.dining, 0.36, 0.7),
  item('moneda-2', 'moneda', ROOM.dining, 0.6, 0.7),
  item('moneda-3', 'moneda', ROOM.dining, 0.5, 0.88),
]
