/**
 * The tiny state machine of one actor (child, neighbour or pet): idle, walking, sitting, emoting, and
 * an independent «carrying» slot (you can walk, sit or emote while holding something).
 * Pure: positions are fractions 0..1 of the scene, `advance` moves along the path by a time step.
 */

export interface Pt {
  readonly x: number
  readonly y: number
}

export type EmoteKind = 'cor' | 'riure' | 'uau' | 'son' | 'salut' | 'abraca' | 'xoca'
export const SOLO_EMOTES = ['cor', 'riure', 'uau', 'son'] as const satisfies readonly EmoteKind[]

export type ActorMode = 'idle' | 'walking' | 'sitting' | 'emoting'

export interface ActorState {
  readonly mode: ActorMode
  readonly at: Pt
  /** 1 = looks right, -1 = looks left. */
  readonly facing: 1 | -1
  readonly path: readonly Pt[]
  readonly seat?: string
  readonly emote?: EmoteKind
  /** Id of the held item. */
  readonly carrying?: string
  /** Room the actor is in (undefined = the scene's first room). */
  readonly room?: string
}

export type ActorEvent =
  | { type: 'walk'; path: readonly Pt[] }
  | { type: 'sit'; seat: string; at: Pt; facing?: 1 | -1 }
  | { type: 'stand' }
  | { type: 'emote'; kind: EmoteKind }
  | { type: 'emoteEnd' }
  | { type: 'pickup'; item: string }
  | { type: 'drop' }
  | { type: 'place'; at: Pt }
  | { type: 'face'; toward: Pt }
  | { type: 'enter'; room: string; at: Pt }

export const spawn = (at: Pt, facing: 1 | -1 = 1): ActorState => ({ mode: 'idle', at, facing, path: [] })

/** Seated actors stand up before doing anything else; `seat` is cleared by every other mode. */
const standing = (s: ActorState): ActorState => {
  const { seat: _seat, ...rest } = s
  return rest
}
const withoutEmote = (s: ActorState): ActorState => {
  const { emote: _emote, ...rest } = s
  return rest
}
const withoutCarry = (s: ActorState): ActorState => {
  const { carrying: _carrying, ...rest } = s
  return rest
}

export const faceToward = (from: Pt, to: Pt, current: 1 | -1): 1 | -1 => (Math.abs(to.x - from.x) < 0.004 ? current : to.x > from.x ? 1 : -1)

export function actorReducer(s: ActorState, e: ActorEvent): ActorState {
  switch (e.type) {
    case 'walk': {
      const next = e.path[0]
      if (!next) return s.mode === 'walking' ? { ...s, mode: 'idle', path: [] } : s
      return { ...withoutEmote(standing(s)), mode: 'walking', path: e.path, facing: faceToward(s.at, next, s.facing) }
    }
    case 'sit':
      return { ...withoutEmote(s), mode: 'sitting', seat: e.seat, at: e.at, path: [], facing: e.facing ?? s.facing }
    case 'stand':
      return s.mode === 'sitting' ? { ...standing(s), mode: 'idle' } : s
    case 'emote':
      if (s.mode === 'walking') return s
      return { ...s, mode: s.mode === 'sitting' ? 'sitting' : 'emoting', emote: e.kind }
    case 'emoteEnd':
      return { ...withoutEmote(s), mode: s.mode === 'emoting' ? 'idle' : s.mode }
    case 'pickup':
      return { ...s, carrying: e.item }
    case 'drop':
      return withoutCarry(s)
    case 'place':
      return { ...withoutCarry(s) }
    case 'face':
      return { ...s, facing: faceToward(s.at, e.toward, s.facing) }
    case 'enter':
      // Through a door: whatever they carry goes with them.
      return { ...withoutEmote(standing(s)), mode: 'idle', room: e.room, at: e.at, path: [] }
  }
}

/** Distance between two points in scene fractions, with y squashed (the floor is a shallow stage). */
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, (a.y - b.y) * 0.7)

/** Moves `speed` fraction-units per second along the path for `dtMs`. Arriving ends the walk. */
export function advance(s: ActorState, dtMs: number, speed = 0.32): ActorState {
  if (s.mode !== 'walking') return s
  let budget = (speed * dtMs) / 1000
  let at = s.at
  let path = s.path
  let facing = s.facing
  while (budget > 0 && path.length > 0) {
    const target = path[0]
    if (!target) break
    const d = dist(at, target)
    facing = faceToward(at, target, facing)
    if (d <= budget) {
      budget -= d
      at = target
      path = path.slice(1)
    } else {
      const t = budget / d
      at = { x: at.x + (target.x - at.x) * t, y: at.y + (target.y - at.y) * t }
      budget = 0
    }
  }
  return path.length === 0 ? { ...s, mode: 'idle', at, path: [], facing } : { ...s, at, path, facing }
}

export type ActorPose = 'idle' | 'wave' | 'cheer' | 'hold' | 'sit'

/** Which body pose the Avatar kit shows for this state. */
export function poseOf(s: ActorState): ActorPose {
  if (s.mode === 'sitting') return 'sit'
  if (s.mode === 'emoting') {
    if (s.emote === 'salut' || s.emote === 'abraca') return 'wave'
    return 'cheer'
  }
  return s.carrying ? 'hold' : 'idle'
}

export const isBusy = (s: ActorState): boolean => s.mode === 'walking'
