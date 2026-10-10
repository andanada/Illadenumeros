import { BallArt } from '../../../sandbox/art/foodArt'
import { type InteractableDef } from '../../../sandbox/defs'
import type { StartItem } from '../../../sandbox/ItemsContext'
import { BoneArt, IceCreamArt, SuitcaseArt } from './itemArt'
import { BUS_ROOM, STOP_ROOM } from './riders'

/** What lies about on the bus and at the stop: a ball to toss in the aisle, a case for the rack, a bone for the pet, an ice cream. */
export const BUS_DEFS: readonly InteractableDef[] = [
  { id: 'pilota', label: 'la pilota', height: 0.11, pickup: true, toss: true, art: () => <BallArt /> },
  { id: 'maleta', label: 'la maleta', height: 0.12, pickup: true, art: () => <SuitcaseArt /> },
  { id: 'os', label: 'l’os de la mascota', height: 0.08, pickup: true, art: () => <BoneArt /> },
  { id: 'gelat', label: 'el gelat', height: 0.11, pickup: true, art: () => <IceCreamArt /> },
]

export const BUS_ITEMS: readonly StartItem[] = [
  { uid: 'pilota', def: 'pilota', room: BUS_ROOM, at: { x: 0.46, y: 0.86 } },
  { uid: 'maleta', def: 'maleta', room: STOP_ROOM, at: { x: 0.14, y: 0.84 } },
  { uid: 'os', def: 'os', room: STOP_ROOM, at: { x: 0.66, y: 0.6 } },
  { uid: 'gelat', def: 'gelat', room: STOP_ROOM, at: { x: 0.6, y: 0.6 } },
]
