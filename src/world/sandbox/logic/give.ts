import { hashSeed } from '../../art/random'
import type { EmoteKind } from './actorMachine'

/** What a character thinks of a gift: a reaction emote and a Catalan line for screen readers. */
export interface GiveReaction {
  readonly emote: EmoteKind
  readonly said: string
}

export interface GiveInput {
  /** Receiver display name («la Pilar»). */
  readonly who: string
  /** Item with article («la poma»). */
  readonly item: string
  /** Item ids this character loves (extra happy). */
  readonly loves?: readonly string[]
  readonly itemId: string
}

const NICE: readonly EmoteKind[] = ['cor', 'riure', 'uau']

export function giveReaction(i: GiveInput): GiveReaction {
  if (i.loves?.includes(i.itemId)) return { emote: 'cor', said: `${cap(i.who)} s’ha enamorat ${i.item}! Quin regal!` }
  const emote = NICE[hashSeed(`${i.who}:${i.itemId}`) % NICE.length] ?? 'cor'
  return { emote, said: `${cap(i.who)} està contenta amb ${i.item}. Gràcies!` }
}

const cap = (t: string): string => (t.length === 0 ? t : `${t[0]?.toUpperCase() ?? ''}${t.slice(1)}`)
