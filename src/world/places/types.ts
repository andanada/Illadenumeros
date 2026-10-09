import type { ComponentType, LazyExoticComponent } from 'react'
import type { GameId, OperationId } from '../../core/ambit/types'
import type { SceneId } from '../model/types'

/** What every place receives from the town shell (same contract the Botiga already follows). */
export interface PlaceProps {
  /** Errands waiting on the board for this place; when > 0 a neighbour comes in by themselves. */
  pending: number
  /** Bumped by the HUD's errand board: "call a neighbour now". */
  callSignal: number
  /** An errand was solved; `coins` already granted by the answer (shown as the +N animation). */
  onSolved: (coins: number) => void
  onExit: () => void
  /** Tests only: fixed skill. */
  forced?: { skillId: string; factKey?: string }
}

/**
 * When a place opens. Places never show a padlock: closed ones show scaffolding and «Obrim aviat!».
 * - 'always': open from day one.
 * - { operation }: opens once the child has started (has any non-locked, non-new skill of) that operation,
 *   which the shell derives from the engine's strict order add → sub → mul → div.
 * - { grade }: opens with the region of that grade (5è market).
 */
export type PlaceUnlock = 'always' | { operation: OperationId } | { grade: 5 }

/** A place plugged into the town. Each place folder exports one of these as `place` from its index.ts. */
export interface PlaceModule {
  id: SceneId
  /** Catalan name on the façade and in announcements. */
  title: string
  /** Attempts are recorded under this game id (mirrored in server docSchemas). */
  gameId: GameId
  /** Skills its errands can serve (intersected with what the child has unlocked). */
  skills: readonly string[]
  unlock: PlaceUnlock
  /** Façade drawn on the street (a PropArt id, or a component exported by the place). */
  facade: string | ComponentType<{ open: boolean }>
  Component: LazyExoticComponent<ComponentType<PlaceProps>>
}
