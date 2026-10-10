import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import type { Block } from '../../../sandbox/logic/walkPlan'
import { AWAY_ROOM, BUS_ROOM, SEAT_IDS, STOP_ROOM } from './riders'

export const BUS_FLOOR_TOP = 0.56
export const STOP_FLOOR_TOP = 0.56

/** Seats of the bus: three on each side of the middle door; the driver has the wheel. */
const SEAT_XS = [0.08, 0.2, 0.32, 0.62, 0.74, 0.86] as const
export const SEAT_SPOTS: readonly SeatDef[] = SEAT_IDS.map((id, i) => ({
  id,
  label: `el seient ${i + 1}`,
  at: { x: SEAT_XS[i] ?? 0.1, y: 0.67 },
  facing: (i < 3 ? 1 : -1) as 1 | -1,
}))
export const WHEEL_SEAT: SeatDef = { id: 'volant', label: 'el volant', at: { x: 0.955, y: 0.7 }, facing: -1 }
export const BUS_SEATS: readonly SeatDef[] = [...SEAT_SPOTS, WHEEL_SEAT]

/** The pole (hold on), the stop button on it, and the luggage rack above the left seats. */
export const BUS_POLE = { x: 0.585, y: 0.78 }
export const STOP_BUTTON = { x: 0.585, y: 0.8 }
export const RACK: SurfaceDef = { id: 'portaequipatges', label: 'el portaequipatges', at: { x: 0.22, y: 0.415 }, stand: { x: 0.26, y: 0.76 } }

export const BUS_DOOR: DoorDef = { id: 'porta-bus', label: 'la porta de l’autobús', at: { x: 0.5, y: 0.68 }, to: STOP_ROOM, arrive: { x: 0.78, y: 0.8 }, box: { w: 0.1, h: 0.36 } }
export const STOP_DOOR: DoorDef = { id: 'porta-parada', label: 'la porta de l’autobús', at: { x: 0.9, y: 0.7 }, to: BUS_ROOM, arrive: { x: 0.46, y: 0.82 }, box: { w: 0.12, h: 0.4 } }

export const STOP_BENCH: readonly SeatDef[] = [
  { id: 'banc-1', label: 'el banc (esquerra)', at: { x: 0.2, y: 0.7 }, facing: 1 },
  { id: 'banc-2', label: 'el banc (dreta)', at: { x: 0.31, y: 0.7 }, facing: 1 },
]
export const KIOSK: SurfaceDef = { id: 'quiosc', label: 'el taulell del quiosc', at: { x: 0.64, y: 0.6 }, stand: { x: 0.6, y: 0.76 } }
export const STOP_BLOCKS: readonly Block[] = [{ x: 0.56, y: 0.5, w: 0.16, h: 0.1 }]
export const BUS_BLOCKS: readonly Block[] = []

export { AWAY_ROOM }
