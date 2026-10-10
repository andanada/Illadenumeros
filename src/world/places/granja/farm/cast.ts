import { NEIGHBOURS_BY_ID } from '../../../characters'
import type { ActorSeed } from '../../../sandbox/types'
import type { AvatarSpec } from '../../../model/types'
import { ROOM } from './rooms'

export const AVATAR = 'laia'
/** The farmer and the neighbours who visit: they carry the maths bubbles. */
export const ASKERS = ['l-avi-ramon', 'la-fatima', 'en-kofi', 'la-mei'] as const
export const FARMER = ASKERS[0]
/** The farm's animals are the town's pets. */
export const ANIMALS = { corral: ['blau', 'nuvol', 'mixa'], hort: ['nyx', 'melo'] } as const
export const ANIMAL_NAMES: Readonly<Record<string, string>> = { blau: 'en Blau', nuvol: 'la Núvol', mixa: 'la Mixa', nyx: 'la Nyx', melo: 'la Melo' }

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)

/** Who carries a request: the neighbour it names when they live here, otherwise one chosen by the request id. */
export function carrierFor(actorId: string, requestId: string): string {
  if ((ASKERS as readonly string[]).includes(actorId)) return actorId
  return ASKERS[hash(requestId) % ASKERS.length] ?? FARMER
}

export function farmSeeds(avatar: AvatarSpec, name: string | undefined): ActorSeed[] {
  const at = (x: number, y: number) => ({ x, y })
  return [
    { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: at(0.3, 0.8), avatar },
    { id: FARMER, kind: 'neighbour', name: 'l’avi Ramon', at: at(0.5, 0.62), neighbour: FARMER, facing: -1, loves: ['gra', 'planta'] },
    ...ASKERS.slice(1).map((id, i) => ({ id, kind: 'neighbour' as const, name: NEIGHBOURS_BY_ID[id]?.name ?? 'un veí', at: at(0.6 + i * 0.1, 0.7), neighbour: id })),
    ...ANIMALS.corral.map((id, i) => ({ id, kind: 'pet' as const, name: ANIMAL_NAMES[id] ?? id, at: at(0.4 + i * 0.1, 0.85), pet: id, loves: ['gra'] })),
    ...ANIMALS.hort.map((id, i) => ({ id, kind: 'pet' as const, name: ANIMAL_NAMES[id] ?? id, at: at(0.5 + i * 0.1, 0.9), pet: id, loves: ['planta'] })),
  ]
}

/** Where everybody starts the day: the visitors in the garden, the dogs and the cat in the farmyard. */
export const START: Readonly<Record<string, { room: string; at: { x: number; y: number } }>> = {
  [FARMER]: { room: ROOM.hort, at: { x: 0.52, y: 0.58 } },
  'la-fatima': { room: ROOM.hort, at: { x: 0.8, y: 0.74 } },
  'en-kofi': { room: ROOM.hort, at: { x: 0.6, y: 0.9 } },
  'la-mei': { room: ROOM.corral, at: { x: 0.55, y: 0.7 } },
  blau: { room: ROOM.corral, at: { x: 0.45, y: 0.9 } },
  nuvol: { room: ROOM.corral, at: { x: 0.72, y: 0.92 } },
  mixa: { room: ROOM.corral, at: { x: 0.86, y: 0.7 } },
  nyx: { room: ROOM.hort, at: { x: 0.9, y: 0.92 } },
  melo: { room: ROOM.hort, at: { x: 0.4, y: 0.76 } },
}
