import { JardiBackdrop, SalaBackdrop } from './art/roomArt'
import type { Block } from './logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from './types'

export interface RoomConfig {
  id: string
  label: string
  floorTop: number
  backdrop: React.ReactNode
  blocks: readonly Block[]
  seats: readonly SeatDef[]
  doors: readonly DoorDef[]
  surfaces: readonly SurfaceDef[]
}

/** The two rooms of the demo: a living room (sofa, fridge, table, door) and the garden behind it. */
export const PLAY_ROOMS: Readonly<Record<string, RoomConfig>> = {
  sala: {
    id: 'sala',
    label: 'La sala',
    floorTop: 0.47,
    backdrop: <SalaBackdrop />,
    blocks: [
      { x: 0.14, y: 0.5, w: 0.33, h: 0.16 },
      { x: 0.76, y: 0.55, w: 0.17, h: 0.15 },
      { x: 0.54, y: 0.4, w: 0.1, h: 0.24 },
    ],
    seats: [
      { id: 'sofa-1', label: 'el sofà (esquerra)', at: { x: 0.24, y: 0.63 }, facing: 1 },
      { id: 'sofa-2', label: 'el sofà (dreta)', at: { x: 0.38, y: 0.63 }, facing: -1 },
    ],
    doors: [{ id: 'porta-jardi', label: 'Porta del jardí', at: { x: 0.065, y: 0.56 }, to: 'jardi', arrive: { x: 0.12, y: 0.78 }, box: { w: 0.1, h: 0.36 } }],
    surfaces: [{ id: 'taula', label: 'la taula', at: { x: 0.84, y: 0.58 }, stand: { x: 0.72, y: 0.74 } }],
  },
  jardi: {
    id: 'jardi',
    label: 'El jardí',
    floorTop: 0.46,
    backdrop: <JardiBackdrop />,
    blocks: [{ x: 0.7, y: 0.4, w: 0.12, h: 0.22 }],
    seats: [],
    doors: [{ id: 'porta-casa', label: 'Porta de casa', at: { x: 0.065, y: 0.56 }, to: 'sala', arrive: { x: 0.13, y: 0.64 }, box: { w: 0.1, h: 0.36 } }],
    surfaces: [],
  },
}
