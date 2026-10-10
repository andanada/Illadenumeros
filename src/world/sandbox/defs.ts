import type { ReactNode } from 'react'
import type { DefBehaviour } from './logic/resolveTap'

/** What the art of an object is told about its state. */
export interface ArtState {
  /** Current stage id of the `use` chain (fruit: crua, neta, tallada…). */
  stage: string
  open: boolean
  /** Surprise: 0..1 how close it is to bursting. */
  charge: number
  /** Surprise result (id of something to draw), when revealed. */
  revealed: string | undefined
  held: boolean
}

/**
 * Declarative description of an object of the sandbox. Behaviour flags are independent and combine:
 * - `pickup`: follows the actor in the hold pose, crosses doors, is put down by tapping the ring / a surface.
 * - `tool`: kind of tool it is when held ('aixeta', 'ganivet'…); a `use` chain asks for these.
 * - `use`: multi-step chain advanced by tapping the right tool onto it.
 * - `container`: opens/closes; things put in it live inside (only reachable while open).
 * - `surprise`: `taps` taps reveal one of `options` (deterministic from the object's uid).
 * - `toss`: flick or «Llança» sends it flying: arc, bounces, rests.
 */
export interface InteractableDef extends DefBehaviour {
  readonly id: string
  /** Catalan with article: «la poma». */
  readonly label: string
  /** SVG content drawn in a box 100 wide × (100 / aspect) high, feet at the bottom centre. */
  readonly art: (s: ArtState) => ReactNode
  /** Width / height of the art box (default 1). */
  readonly aspect?: number
  /** Height as a fraction of the stage height. */
  readonly height: number
  readonly pickup?: boolean
  readonly toss?: boolean
  readonly sound?: 'squish' | 'plop' | 'coin' | 'lift'
  /** Indefinite form for counting announcements: «una poma». Defaults to the label. */
  readonly single?: string
  /** Objects of this def can pile up in one stack with a quantity (`spawn(…, {qty})`); picking takes one. */
  readonly stackable?: boolean
  /** Show the stack's quantity as a small badge when it is more than one (default off: a place asks). */
  readonly quantityBadge?: boolean
  readonly surpriseTaps?: number
  readonly surpriseOptions?: readonly string[]
}

export type DefMap = Readonly<Record<string, InteractableDef>>

export const defMap = (list: readonly InteractableDef[]): DefMap => Object.fromEntries(list.map((d) => [d.id, d]))
