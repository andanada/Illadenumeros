import type { StartItem } from '../../../sandbox/ItemsContext'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { CorralBackdrop, FLOOR_TOP, HortBackdrop } from './farmArt'

export const ROOM = { hort: 'hort', corral: 'corral', street: 'fora' } as const

export interface FarmRoom {
  readonly id: string
  readonly label: string
  readonly backdrop: React.ReactNode
  readonly blocks: readonly Block[]
  readonly seats: readonly SeatDef[]
  readonly doors: readonly DoorDef[]
  readonly surfaces: readonly SurfaceDef[]
}

const door = (to: string, at: { x: number; y: number }, label: string, arrive: { x: number; y: number }): DoorDef => ({ id: `porta-${to}`, label, at, to, arrive, box: { w: 0.075, h: 0.26 } })

export const FARM_FLOOR_TOP = FLOOR_TOP

export const ROOMS: Readonly<Record<string, FarmRoom>> = {
  [ROOM.hort]: {
    id: ROOM.hort,
    label: 'L’hort',
    backdrop: <HortBackdrop />,
    blocks: [{ x: 0.36, y: 0.44, w: 0.1, h: 0.06 }],
    seats: [],
    doors: [door(ROOM.street, { x: 0.05, y: 0.58 }, 'Barrera del carrer', { x: 0.5, y: 0.7 }), door(ROOM.corral, { x: 0.955, y: 0.58 }, 'Camí cap al corral', { x: 0.16, y: 0.72 })],
    surfaces: [{ id: 'taula-hort', label: 'la taula de l’hort', at: { x: 0.2, y: 0.9 }, stand: { x: 0.26, y: 0.9 } }],
  },
  [ROOM.corral]: {
    id: ROOM.corral,
    label: 'El corral',
    backdrop: <CorralBackdrop />,
    blocks: [{ x: 0.1, y: 0.44, w: 0.2, h: 0.1 }, { x: 0.62, y: 0.78, w: 0.24, h: 0.1 }],
    seats: [
      { id: 'tractor-1', label: 'el seient del tractor', at: { x: 0.3, y: 0.9 }, facing: 1 },
      { id: 'tractor-2', label: 'el cistell del tractor', at: { x: 0.2, y: 0.9 }, facing: 1 },
    ],
    doors: [door(ROOM.hort, { x: 0.045, y: 0.58 }, 'Camí cap a l’hort', { x: 0.84, y: 0.72 })],
    surfaces: [{ id: 'estable', label: 'el graner', at: { x: 0.56, y: 0.6 }, stand: { x: 0.56, y: 0.66 } }],
  },
}

/** The free-play plot: ten seeds, five to a row, in the upper soil. The request's own zones lie below it. */
export const FREE_PLOT: ZoneDef = { id: 'hort-lliure', room: ROOM.hort, rect: { x: 0.4, y: 0.485, w: 0.3, h: 0.115 }, label: 'les files de l’hort', capacity: 10, cols: 5, accepts: (def) => def === 'planta' }
/** Where harvested things go (and are counted aloud). */
export const HARVEST: ZoneDef = { id: 'collita', room: ROOM.hort, rect: { x: 0.73, y: 0.485, w: 0.17, h: 0.115 }, label: 'la cistella de la collita', capacity: 6, cols: 3, accepts: (def) => def === 'planta' }
export const EGG_BOX_6: ZoneDef = { id: 'caixa-6', room: ROOM.corral, rect: { x: 0.7, y: 0.5, w: 0.13, h: 0.11 }, label: 'la caixa de 6 ous', capacity: 6, cols: 3, accepts: (def) => def === 'ou' }
export const EGG_BOX_10: ZoneDef = { id: 'caixa-10', room: ROOM.corral, rect: { x: 0.84, y: 0.5, w: 0.14, h: 0.11 }, label: 'la caixa de 10 ous', capacity: 10, cols: 5, accepts: (def) => def === 'ou' }
export const FARM_ZONES: readonly ZoneDef[] = [FREE_PLOT, HARVEST, EGG_BOX_6, EGG_BOX_10]

const f = (uid: string, def: string, room: string, x: number, y: number): StartItem => ({ uid, def, room, at: { x, y } })
const inside = (uid: string, def: string, box: string, room: string): StartItem => ({ uid, def, room, at: { x: 0, y: 0 }, inside: box })
const L = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

export const FARM_START: readonly StartItem[] = [
  f('sac-llavors', 'sac-llavors', ROOM.hort, 0.27, 0.68),
  ...L.slice(0, 6).map((n) => inside(`planta-${n}`, 'planta', 'sac-llavors', ROOM.hort)),
  f('regadora', 'regadora', ROOM.hort, 0.12, 0.68),
  f('adob', 'adob', ROOM.hort, 0.19, 0.68),
  f('sac-gra', 'sac-gra', ROOM.corral, 0.62, 0.72),
  ...L.slice(0, 6).map((n) => inside(`gra-${n}`, 'gra', 'sac-gra', ROOM.corral)),
  f('niu-1', 'niu', ROOM.corral, 0.33, 0.6),
  ...L.slice(0, 4).map((n) => inside(`ou-${n}`, 'ou', 'niu-1', ROOM.corral)),
  f('gallina-1', 'gallina', ROOM.corral, 0.3, 0.7),
  f('gallina-2', 'gallina', ROOM.corral, 0.26, 0.78),
]
