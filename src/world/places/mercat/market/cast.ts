import { NEIGHBOURS_BY_ID } from '../../../characters'
import type { AvatarSpec } from '../../../model/types'
import type { ActorSeed } from '../../../sandbox/types'
import { STALLS } from './marketArt'

export const AVATAR = 'laia'
/** The stallholders, one behind each stall in the order of STALLS. */
export const VENDORS = ['senyora-pilar', 'en-pau', 'l-avi-ramon', 'la-nuria'] as const
/** Neighbours who shop: they wander from stall to stall. */
export const SHOPPERS = ['la-fatima', 'en-kofi', 'la-mei'] as const
export const CAT = 'mixa'
/** Everybody who can carry a bubble. */
export const ASKERS: readonly string[] = [...SHOPPERS, ...VENDORS]

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)

/** Who carries a request: the neighbour it names when they are in the market, otherwise one of the shoppers by request id. */
export function carrierFor(actorId: string, requestId: string): string {
  if (ASKERS.includes(actorId)) return actorId
  return SHOPPERS[hash(requestId) % SHOPPERS.length] ?? SHOPPERS[0]
}

export function marketSeeds(avatar: AvatarSpec, name: string | undefined): ActorSeed[] {
  const nameOf = (id: string): string => NEIGHBOURS_BY_ID[id]?.name ?? 'un veí'
  return [
    { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: { x: 0.3, y: 0.86 }, avatar },
    ...VENDORS.map((id, i) => ({ id, kind: 'neighbour' as const, name: nameOf(id), at: { x: STALLS[i]?.x ?? 0.5, y: 0.53 }, neighbour: id, facing: 1 as const, loves: ['poma', 'flor'] })),
    ...SHOPPERS.map((id, i) => ({ id, kind: 'neighbour' as const, name: nameOf(id), at: { x: 0.28 + i * 0.22, y: 0.74 + (i % 2) * 0.06 }, neighbour: id })),
    { id: CAT, kind: 'pet', name: 'la gata Mixa', at: { x: 0.52, y: 0.9 }, pet: 'mixa' },
  ]
}

/** Where the shoppers stroll to, in front of the stalls. */
export const STROLL = [
  { x: 0.14, y: 0.72 },
  { x: 0.38, y: 0.74 },
  { x: 0.63, y: 0.72 },
  { x: 0.88, y: 0.74 },
  { x: 0.5, y: 0.88 },
] as const
