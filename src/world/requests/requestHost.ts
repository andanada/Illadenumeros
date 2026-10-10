import type { ComponentType } from 'react'
import type { SceneId } from '../model/types'
import type { AnyErrandAdapter } from '../errands/types'
import type { Request } from './types'

/** Where a request's bubble sits in the place's scene, in the scene's own coordinates (0..1 of its width / height). */
export interface AnchorPosition {
  readonly actorId: string
  readonly x: number
  readonly y: number
}

/**
 * What a place provides to the request system (implemented by the five places in step S2):
 * - `anchors`: where each character that can carry a request stands, so a bubble can hang over them;
 * - `adapters` + `gameId` + `skillIds`: how to play the engine's item in the world (same as useErrand);
 * - `Stage`: optional component that plays one request in place (the character walks up, the task opens).
 * The shell hands the place `requests` (live, waiting first) and `resolve` (call once per solved request).
 */
export interface RequestHost {
  readonly placeId: SceneId
  readonly anchors: readonly AnchorPosition[]
  readonly adapters: readonly AnyErrandAdapter[]
  readonly gameId: string
  readonly skillIds: readonly string[]
  readonly Stage?: ComponentType<RequestStageProps>
}

export interface RequestStageProps {
  readonly request: Request
  /** Coins earned by the solved answer; `clean` = right at the first try without help. */
  readonly onResolved: (coins: number) => void
  /** Walk away: the bubble calms, nothing is lost. */
  readonly onIgnore: () => void
}
