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
    { id: AVATAR, kind: 'avatar', name: name ? `en ${name}` : 'tu', at: { x: 0.275, y: 0.97 }, avatar },
    ...VENDORS.map((id, i) => ({ id, kind: 'neighbour' as const, name: nameOf(id), at: { x: STALLS[i]?.x ?? 0.5, y: 0.53 }, neighbour: id, facing: 1 as const, loves: ['poma', 'flor'] })),
    ...SHOPPERS.map((id, i) => ({ id, kind: 'neighbour' as const, name: nameOf(id), at: { x: [0.52, 0.64, 0.76][i] ?? 0.7, y: 0.97 }, neighbour: id })),
    { id: CAT, kind: 'pet', name: 'la gata Mixa', at: { x: 0.45, y: 0.7 }, pet: 'mixa' },
  ]
}

/** Where the shoppers stroll to: along the bottom of the square, below the goods on the counters, in the gaps between them (a person's touch area is tall). */
export const STROLL = [
  { x: 0.16, y: 0.97 },
  { x: 0.39, y: 0.96 },
  { x: 0.64, y: 0.97 },
  { x: 0.88, y: 0.96 },
  { x: 0.52, y: 0.97 },
] as const

/** While a request is on, the shoppers who do not ask step aside in front of the stalls, away from the scale and the tray. */
/** Where whoever asks waits for the child once the bubble is tapped. */
export const ASKER_AT = { x: 0.5, y: 0.64 } as const

export const STEP_ASIDE: Readonly<Record<string, { x: number; y: number }>> = {
  'la-fatima': { x: 0.62, y: 0.64 },
  'en-kofi': { x: 0.9, y: 0.64 },
  'la-mei': { x: 0.07, y: 0.66 },
}
