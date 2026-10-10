import { dist, type EmoteKind, type Pt } from './actorMachine'

export type SocialKind = 'salut' | 'abraca' | 'xoca'

export const SOCIAL_LABEL: Readonly<Record<SocialKind, { button: string; verb: string }>> = {
  salut: { button: 'Saluda', verb: 'saluda' },
  abraca: { button: 'Abraça', verb: 'abraça' },
  xoca: { button: 'Xoca els cinc', verb: 'xoca els cinc amb' },
}

export const SOCIAL_KINDS: readonly SocialKind[] = ['salut', 'abraca', 'xoca']

/** Emote each side plays: hugs make hearts, high fives make cheers, a hello is answered with a hello. */
export function socialEmotes(kind: SocialKind): { actor: EmoteKind; other: EmoteKind } {
  if (kind === 'abraca') return { actor: 'abraca', other: 'cor' }
  if (kind === 'xoca') return { actor: 'xoca', other: 'xoca' }
  return { actor: 'salut', other: 'salut' }
}

/** Distance (scene fractions) at which two actors are «together». */
export const TOGETHER = 0.11

/** Spot next to `to` where `from` stops to meet them: on the side they come from. */
export function meetingSpot(from: Pt, to: Pt, gap = TOGETHER * 0.8): Pt {
  const side = from.x <= to.x ? -1 : 1
  return { x: Math.min(0.97, Math.max(0.03, to.x + side * gap)), y: to.y }
}

/**
 * A pet keeps a respectful distance behind its leader: it only moves once the leader is farther than
 * `gap * 1.6`, and then stops `gap` away on the side it is coming from.
 */
export function followSpot(pet: Pt, leader: Pt, gap = 0.13): Pt | undefined {
  if (dist(pet, leader) <= gap * 1.6) return undefined
  const side = pet.x <= leader.x ? -1 : 1
  return { x: Math.min(0.97, Math.max(0.03, leader.x + side * gap)), y: Math.min(0.97, leader.y + 0.01) }
}
