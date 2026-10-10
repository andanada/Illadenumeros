import { actorReducer, advance, type ActorEvent, type ActorState } from './actorMachine'
import type { SocialKind } from './social'

/** All the actors of a scene and which one the child is moving. Pure; the React layer only dispatches. */
export interface CastState {
  readonly actors: Readonly<Record<string, ActorState>>
  readonly selected: string
  /** After «Abraça / Saluda / Xoca» in the ring: the next actor tapped is the partner. */
  readonly social: SocialKind | undefined
}

export type CastAction =
  | { type: 'select'; id: string }
  | { type: 'actor'; id: string; event: ActorEvent }
  | { type: 'tick'; dtMs: number }
  | { type: 'social'; kind: SocialKind | undefined }
  | { type: 'put'; id: string; state: ActorState }
  | { type: 'add'; id: string; state: ActorState }

export const makeCast = (actors: Readonly<Record<string, ActorState>>, selected: string): CastState => ({ actors, selected, social: undefined })

export function castReducer(s: CastState, a: CastAction): CastState {
  switch (a.type) {
    case 'select':
      return s.actors[a.id] ? { ...s, selected: a.id, social: undefined } : s
    case 'actor': {
      const cur = s.actors[a.id]
      return cur ? { ...s, actors: { ...s.actors, [a.id]: actorReducer(cur, a.event) } } : s
    }
    case 'tick': {
      let changed = false
      const next: Record<string, ActorState> = {}
      for (const [id, st] of Object.entries(s.actors)) {
        const moved = advance(st, a.dtMs)
        if (moved !== st) changed = true
        next[id] = moved
      }
      return changed ? { ...s, actors: next } : s
    }
    case 'social':
      return { ...s, social: a.kind }
    case 'put':
      return { ...s, actors: { ...s.actors, [a.id]: a.state } }
    case 'add':
      return s.actors[a.id] ? s : { ...s, actors: { ...s.actors, [a.id]: a.state } }
  }
}

export const anyWalking = (s: CastState): boolean => Object.values(s.actors).some((x) => x.mode === 'walking')
