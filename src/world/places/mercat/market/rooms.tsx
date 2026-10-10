import type { StartItem } from '../../../sandbox/ItemsContext'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { PIECES, pieceId } from './MoneyArt'
import { FLOOR_TOP, MarketBackdrop, STALLS } from './marketArt'
import type { ScaleTask } from './priceLogic'

export const ROOM = 'placa'
export const STREET = 'fora'
export { FLOOR_TOP }

const SLOT_DX = [-0.055, 0, 0.055] as const

/** Three places on each stall's counter where goods are put down (to arrange the stall). */
export const SURFACES: readonly SurfaceDef[] = STALLS.flatMap((s) =>
  SLOT_DX.map((dx, i) => ({ id: `${s.id}-${i + 1}`, label: `${s.name}, lloc ${i + 1}`, at: { x: s.x + dx, y: 0.585 }, stand: { x: s.x + dx, y: 0.68 } })),
)

export const BLOCKS: readonly Block[] = STALLS.map((s) => ({ x: s.x - 0.09, y: 0.46, w: 0.18, h: 0.13 }))

export const SEATS: readonly SeatDef[] = [{ id: 'banc-placa', label: 'el banc de la plaça', at: { x: 0.5, y: 0.7 }, facing: -1 }]

export const DOORS: readonly DoorDef[] = [{ id: 'porta-fora', label: 'Sortida al carrer', at: { x: 0.04, y: 0.62 }, to: STREET, arrive: { x: 0.5, y: 0.7 }, box: { w: 0.075, h: 0.26 } }]

export const BACKDROP = <MarketBackdrop />

/** The free-play scale: put goods on it and it says how much they weigh. */
export const SCALE_ZONE: ZoneDef = { id: 'bascula', room: ROOM, rect: { x: 0.27, y: 0.64, w: 0.15, h: 0.1 }, label: 'la bàscula', capacity: 6, cols: 3, accepts: (def) => ['poma', 'taronja', 'formatge', 'bossa', 'flor'].includes(def) }
export const FREE_ZONES: readonly ZoneDef[] = [SCALE_ZONE]

/** Where the loose pieces and bags are heaped for a request. */
export const PILE_AT = { x: 0.16, y: 0.8 } as const

/** The cashier tray of a request: room for the pieces it may take, in two rows. */
export function trayZone(): ZoneDef {
  return { id: 'safata', room: ROOM, rect: { x: 0.5, y: 0.7, w: 0.42, h: 0.2 }, label: 'la safata de la caixa', capacity: 12, cols: 6, accepts: (def) => PIECES.some((c) => pieceId(c) === def) }
}

/** The scale of a request: a row of ten bags to the line, as many lines as needed. */
export function bagsZone(task: ScaleTask): ZoneDef {
  const capacity = task.tenths + 2
  const rows = Math.ceil(capacity / 10)
  return { id: 'bascula-peticio', room: ROOM, rect: { x: 0.45, y: 0.95 - rows * 0.09 - 0.02, w: 0.52, h: rows * 0.09 + 0.02 }, label: 'la bàscula gran', capacity, cols: 10, accepts: (def) => def === 'bossa' }
}

const f = (uid: string, def: string, x: number, y: number): StartItem => ({ uid, def, room: ROOM, at: { x, y } })

export const MARKET_START: readonly StartItem[] = [
  f('poma-1', 'poma', 0.08, 0.585),
  f('taronja-1', 'taronja', 0.18, 0.585),
  f('formatge-1', 'formatge', 0.33, 0.585),
  f('formatge-2', 'formatge', 0.43, 0.585),
  f('flor-1', 'flor', 0.58, 0.585),
  f('flor-2', 'flor', 0.68, 0.585),
  f('camisa-1', 'camisa', 0.83, 0.585),
  f('camisa-2', 'camisa', 0.93, 0.585),
  f('bossa-1', 'bossa', 0.3, 0.9),
  f('bossa-2', 'bossa', 0.4, 0.93),
  f('taronja-2', 'taronja', 0.7, 0.92),
]
