import type { SceneId } from '../model/types'
import { NEIGHBOURS } from '../characters/neighbours'
import { isQuiet, isQuotaDone, liveAt, remainingFor, TARGET_SECONDS, type DayState } from './dayState'
import type { Request, RequestKind } from './types'

/**
 * The gentle pacing governor: decides how many requests are «waiting» (a bubble up) per open place.
 * It never forces anything: it only chooses how often a character has a need. All numbers are here.
 */
export const MAX_PER_PLACE = 2
/** A bubble calms down (not a failure) this long after it appeared. */
export const CALM_AFTER_MS = 90_000
/** A place that just had a request solved stays quiet this long. */
export const COOLDOWN_MS = 20_000
/** Playing time over which the day's quota is expected to be spread. */
export const PLAY_WINDOW_MS = 20 * 60_000
/** Before this much play nobody is «behind». */
export const BEHIND_AFTER_MS = 3 * 60_000
/** Behind = less than this share of the expected pace; ahead = more than this multiple of it. */
export const BEHIND_RATIO = 0.6
export const AHEAD_RATIO = 1.25
/** Waiting bubbles in the whole town at once: normal, behind, ahead, quiet. */
export const TOTAL_CAP = { normal: 3, behind: 5, ahead: 1, quiet: 2 } as const

export interface GovernorPlace {
  readonly id: SceneId
  readonly skills: readonly string[]
}

export interface GovernorContext {
  /** Injected clock (ms). */
  readonly now: number
  /** Day seed (daySeed(day)) so the order of places is stable all day. */
  readonly seed: number
  /** Open places only, in street order. */
  readonly places: readonly GovernorPlace[]
  /** Skill groups of the day (same weighting as the daily mission): current operation / spaced review. */
  readonly core: ReadonlySet<string>
  readonly review: ReadonlySet<string>
}

const KIND_OF_PLACE: Readonly<Partial<Record<SceneId, RequestKind>>> = {
  casa: 'cook',
  botiga: 'serve',
  autobus: 'drive',
  perruqueria: 'style',
  recreatius: 'play',
}

export const WARMUP_PLACE: SceneId = 'recreatius'

export type Pace = 'quiet' | 'behind' | 'ahead' | 'normal'

/** How the day is going, from the minutes played, the jar and the recent accuracy. Pure. */
export function paceOf(state: DayState): Pace {
  if (isQuiet(state)) return 'quiet'
  const expected = TARGET_SECONDS * Math.min(1, state.playedMs / PLAY_WINDOW_MS)
  if (state.playedMs >= BEHIND_AFTER_MS && state.seconds < expected * BEHIND_RATIO) return 'behind'
  if (expected > 0 && state.seconds > expected * AHEAD_RATIO) return 'ahead'
  return 'normal'
}

const rotate = <T,>(items: readonly T[], seed: number): T[] => {
  if (items.length === 0) return []
  const start = seed % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

/** Warm-up place first, then the others rotated by the day's seed. */
function priority(state: DayState, ctx: GovernorContext): GovernorPlace[] {
  const warm = ctx.places.filter((p) => p.id === WARMUP_PLACE && remainingFor(state, p.id) > 0)
  return [...warm, ...rotate(ctx.places.filter((p) => !warm.includes(p)), ctx.seed)]
}

/** Requests that should be waiting per place right now. Pure and deterministic. */
export function desiredWaiting(state: DayState, ctx: GovernorContext): Partial<Record<SceneId, number>> {
  if (isQuotaDone(state)) return {}
  const pace = paceOf(state)
  const perPlace = pace === 'behind' ? MAX_PER_PLACE : 1
  let room = TOTAL_CAP[pace]
  const want: Partial<Record<SceneId, number>> = {}
  for (const place of priority(state, ctx)) {
    const cooling = ctx.now - (state.lastSolvedAt[place.id] ?? -Infinity) < COOLDOWN_MS
    const n = cooling ? 0 : Math.min(perPlace, remainingFor(state, place.id), room)
    if (n <= 0) continue
    want[place.id] = n
    room -= n
  }
  return want
}

/** The skill the plan aims a request at: the day's current operation for «repte», reviews for «repàs». */
function pickSkill(place: GovernorPlace, state: DayState, ctx: GovernorContext, n: number): string | undefined {
  const kind = state.board.tasks.find((t) => t.place === place.id)?.kind
  const inGroup = (group: ReadonlySet<string>): string[] => place.skills.filter((s) => group.has(s))
  const first = kind === 'repte' ? inGroup(ctx.core) : inGroup(ctx.review)
  const pool = first.length > 0 ? first : [...inGroup(ctx.core), ...inGroup(ctx.review)]
  const all = pool.length > 0 ? pool : place.skills
  return all[(ctx.seed + n) % Math.max(all.length, 1)]
}

function actorOf(place: SceneId, state: DayState, seed: number): string {
  const fromBoard = state.board.tasks.find((t) => t.place === place)?.neighbour
  return fromBoard ?? NEIGHBOURS[seed % NEIGHBOURS.length]?.id ?? 'senyora-pilar'
}

function spawn(state: DayState, place: GovernorPlace, ctx: GovernorContext): DayState {
  const skillId = pickSkill(place, state, ctx, state.spawned)
  const request: Request = {
    id: `${state.day}:${place.id}:${state.spawned}`,
    placeId: place.id,
    kind: KIND_OF_PLACE[place.id] ?? 'give',
    actorId: actorOf(place.id, state, ctx.seed),
    ...(skillId ? { skillId } : {}),
    createdAt: ctx.now,
    expiresSoft: ctx.now + CALM_AFTER_MS,
  }
  return { ...state, live: [...state.live, request], spawned: state.spawned + 1 }
}

/**
 * Brings the live requests in line with the governor: removes what the day no longer needs (quota done,
 * more than what is left at a place), then adds requests where fewer than wanted are live. Calm ones
 * count as live (they are re-woken, not replaced) and nothing waiting is ever taken away to «pace» her.
 */
export function reconcile(state: DayState, ctx: GovernorContext): DayState {
  if (isQuotaDone(state)) return state.live.length === 0 ? state : { ...state, live: [] }
  const kept = state.live.filter((r, i) => state.live.filter((o, j) => o.placeId === r.placeId && j < i).length < remainingFor(state, r.placeId))
  let next: DayState = kept.length === state.live.length ? state : { ...state, live: kept }
  const want = desiredWaiting(next, ctx)
  for (const place of ctx.places) {
    for (let have = liveAt(next, place.id).length; have < (want[place.id] ?? 0); have++) next = spawn(next, place, ctx)
  }
  return next
}

/**
 * The child came into a place (or tapped a calm character): its calm requests wake up again, and if
 * nobody has a need there and the day still has some left, one character does. Ignores the cooldown.
 */
export function wake(state: DayState, placeId: SceneId, ctx: GovernorContext): DayState {
  const place = ctx.places.find((p) => p.id === placeId)
  if (!place || isQuotaDone(state) || remainingFor(state, placeId) === 0) return state
  const mine = liveAt(state, placeId)
  if (mine.length === 0) return spawn(state, place, ctx)
  const woken = state.live.map((r) => (r.placeId === placeId && ctx.now >= r.expiresSoft ? { ...r, createdAt: ctx.now, expiresSoft: ctx.now + CALM_AFTER_MS } : r))
  return { ...state, live: woken }
}

/** Adds time played today (the town is open). */
export const addPlayed = (state: DayState, ms: number): DayState => ({ ...state, playedMs: Math.min(86_400_000, state.playedMs + Math.max(0, Math.round(ms))) })
