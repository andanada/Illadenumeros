import { defaultAvatar } from '../../../characters'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { ActorSeed, DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import type { CabinetId } from '../cabinets/cabinetDefs'

export const ARCADE_FLOOR_TOP = 0.5
export const CHILD_ID = 'laia'
export const CLERK_ID = 'en-kofi'

/** Where each cabinet stands (feet, fractions of the stage) and where the player stands to use it. */
export const CABINET_SPOTS: Readonly<Record<CabinetId, { x: number; y: number }>> = {
  duel: { x: 0.49, y: 0.64 },
  tren: { x: 0.62, y: 0.64 },
  pesca: { x: 0.75, y: 0.64 },
}
export const cabinetStand = (id: CabinetId): { x: number; y: number } => ({ x: CABINET_SPOTS[id].x, y: 0.73 })

export const CLAW_SPOT = { x: 0.19, y: 0.66 }
export const BOOTH_SPOT = { x: 0.35, y: 0.66 }
export const COUNTER_SPOT = { x: 0.91, y: 0.7 }
export const HOCKEY_SPOT = { x: 0.6, y: 0.95 }
export const clawStand = { x: 0.2, y: 0.75 }
export const boothStand = { x: 0.35, y: 0.75 }

export const ARCADE_BLOCKS: readonly Block[] = [
  { x: 0.1, y: 0.5, w: 0.18, h: 0.16 },
  { x: 0.28, y: 0.5, w: 0.14, h: 0.16 },
  { x: 0.435, y: 0.5, w: 0.11, h: 0.15 },
  { x: 0.565, y: 0.5, w: 0.11, h: 0.15 },
  { x: 0.695, y: 0.5, w: 0.11, h: 0.15 },
  { x: 0.83, y: 0.58, w: 0.17, h: 0.12 },
  { x: 0.46, y: 0.84, w: 0.28, h: 0.11 },
]

export const ARCADE_SEATS: readonly SeatDef[] = [
  { id: 'puf-1', label: 'el puf vermell', at: { x: 0.84, y: 0.88 }, facing: -1 },
  { id: 'puf-2', label: 'el puf blau', at: { x: 0.93, y: 0.88 }, facing: -1 },
]

export const EXIT_DOOR: DoorDef = { id: 'porta-carrer', label: 'la porta al carrer', at: { x: 0.06, y: 0.78 }, to: 'carrer', arrive: { x: 0.5, y: 0.8 }, box: { w: 0.1, h: 0.3 } }
export const COUNTER_SURFACE: SurfaceDef = { id: 'taulell', label: 'el taulell dels premis', at: { x: 0.85, y: 0.66 }, stand: { x: 0.84, y: 0.76 } }

/** The cast: the child, her pet, the clerk behind the counter and two kids who are playing. */
export function arcadeSeeds(avatar = defaultAvatar('nyx', 'rosa')): ActorSeed[] {
  return [
    { id: CHILD_ID, kind: 'avatar', name: 'la Laia', at: { x: 0.3, y: 0.86 }, avatar },
    { id: CLERK_ID, kind: 'neighbour', name: 'en Kofi', neighbour: 'en-kofi', at: { x: 0.91, y: 0.6 }, facing: -1, loves: ['premi-osset', 'premi-cotxet', 'premi-vareta'] },
    { id: 'en-pau', kind: 'neighbour', name: 'en Pau', neighbour: 'en-pau', at: { x: 0.4, y: 0.92 }, facing: 1, loves: ['disc', 'pilota'] },
    { id: 'la-mei', kind: 'neighbour', name: 'la Mei', neighbour: 'la-mei', at: { x: 0.685, y: 0.77 }, facing: -1, loves: ['premi-osset'] },
    { id: 'nyx', kind: 'pet', name: 'la Nyx', pet: 'nyx', at: { x: 0.24, y: 0.9 }, follow: CHILD_ID },
  ]
}
