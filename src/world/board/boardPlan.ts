import type { SkillNode } from '../../core/ambit/types'
import type { FactState } from '../../core/engine/leitner'
import type { SkillState } from '../../core/engine/mastery'
import { coreOperation } from '../../core/engine/operationOrder'
import { MASTERY_THRESHOLDS } from '../../core/engine/thresholds'
import { buildMissionPlan, type MissionStep } from '../../features/daily-mission/missionPlan'
import { NEIGHBOURS } from '../characters/neighbours'
import type { SceneId } from '../model/types'

/**
 * «El tauler d’encàrrecs»: the day's errands spread over the open places, with the daily mission's
 * weighting (src/features/daily-mission/missionPlan.ts): a warm-up at the Recreatius, at least half of
 * the errands where the operation in progress is practised, the rest as spaced review of earlier ones.
 * Pure and deterministic per local day, so the board never reshuffles while she plays.
 */

/** Seconds an errand takes on average (a neighbour served, or one machine round at the Recreatius). */
const ERRAND_SECONDS = 72
export const BOARD_ERRANDS = Math.round((MASTERY_THRESHOLDS.mission.minutes * 60) / ERRAND_SECONDS)
export const WARMUP_PLACE: SceneId = 'recreatius'

export type BoardKind = 'calentament' | 'repte' | 'repas'

export interface BoardPlace {
  readonly id: SceneId
  readonly skills: readonly string[]
}

export interface BoardTask {
  readonly place: SceneId
  readonly count: number
  readonly kind: BoardKind
  /** Neighbour preset id drawn on the card. */
  readonly neighbour: string
}

export interface BoardPlan {
  readonly day: string
  readonly tasks: readonly BoardTask[]
}

export interface BoardInput {
  /** Local calendar day, 'YYYY-MM-DD' (see todayKey). */
  readonly day: string
  /** Open places only, in street order. */
  readonly places: readonly BoardPlace[]
  readonly skills: readonly SkillNode[]
  readonly states: Readonly<Record<string, SkillState>>
  readonly factStates?: Readonly<Record<string, FactState>>
}

/** Who usually asks at each place (the card's face). */
const PLACE_NEIGHBOUR: Partial<Record<SceneId, string>> = {
  botiga: 'senyora-pilar',
  autobus: 'en-jordi',
  perruqueria: 'la-nuria',
  fleca: 'en-pau',
  casa: 'la-fatima',
  granja: 'l-avi-ramon',
  recreatius: 'en-kofi',
  pizzeria: 'la-mei',
}

/** FNV-1a of the day key: same number all day, on any timezone (the key is already local). */
export function daySeed(day: string): number {
  let hash = 0x811c9dc5
  for (const ch of day) hash = Math.imul(hash ^ ch.charCodeAt(0), 0x01000193)
  return hash >>> 0
}

const rotate = <T,>(items: readonly T[], seed: number): T[] => {
  if (items.length === 0) return []
  const start = seed % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

const stepSkills = (plan: readonly MissionStep[], id: MissionStep['id']): readonly string[] | undefined => plan.find((s) => s.id === id)?.skillIds

/** Skill groups of the day, from the daily mission's plan. */
function skillGroups(input: BoardInput, seed: number): { core: ReadonlySet<string>; review: ReadonlySet<string>; available: ReadonlySet<string> } {
  const mission = buildMissionPlan(input.skills, input.states, seed, input.factStates ?? {})
  const available = new Set(stepSkills(mission, 'lliure') ?? input.skills.map((s) => s.id))
  const op = coreOperation(input.skills, input.states)
  const core = new Set([...input.skills.filter((s) => op !== undefined && s.operation === op && available.has(s.id)).map((s) => s.id), ...(stepSkills(mission, 'repte') ?? [])])
  const review = new Set((stepSkills(mission, 'repas') ?? [...available]).filter((id) => !core.has(id)))
  return { core, review, available }
}

const serves = (place: BoardPlace, skills: ReadonlySet<string>): boolean => place.skills.some((id) => skills.has(id))

/** Hands `count` errands of `kind` round-robin over `places`. */
const deal = (places: readonly BoardPlace[], count: number, kind: BoardKind): { place: SceneId; kind: BoardKind }[] =>
  places.length === 0 ? [] : Array.from({ length: count }, (_, i) => ({ place: (places[i % places.length] as BoardPlace).id, kind }))

/** One card per place, in the order the errands were dealt; a card keeps the kind of its first errand. */
function merge(dealt: readonly { place: SceneId; kind: BoardKind }[], seed: number): BoardTask[] {
  const order = [...new Set(dealt.map((d) => d.place))]
  return order.map((place, i) => {
    const mine = dealt.filter((d) => d.place === place)
    const fallback = NEIGHBOURS[(seed + i) % NEIGHBOURS.length]?.id ?? 'senyora-pilar'
    return { place, count: mine.length, kind: (mine[0] as { kind: BoardKind }).kind, neighbour: PLACE_NEIGHBOUR[place] ?? fallback }
  })
}

export function buildBoard(input: BoardInput): BoardPlan {
  const seed = daySeed(input.day)
  if (input.places.length === 0) return { day: input.day, tasks: [] }
  const { core, review, available } = skillGroups(input, seed)
  const warmup = input.places.find((p) => p.id === WARMUP_PLACE)
  const work = input.places.filter((p) => p.id !== WARMUP_PLACE)
  const workOrAll = work.length > 0 ? work : input.places
  const corePlaces = rotate(workOrAll.filter((p) => serves(p, core)), seed)
  const reviewPlaces = rotate(workOrAll.filter((p) => serves(p, review)), seed >>> 3)
  const anyPlaces = rotate(workOrAll.filter((p) => serves(p, available)).length > 0 ? workOrAll.filter((p) => serves(p, available)) : workOrAll, seed)

  const warm = warmup && work.length > 0 ? 1 : 0
  const coreCount = corePlaces.length > 0 ? Math.ceil(BOARD_ERRANDS * MASTERY_THRESHOLDS.mission.coreShare) : 0
  const reviewCount = BOARD_ERRANDS - warm - coreCount
  const reviewTarget = reviewPlaces.length > 0 ? reviewPlaces : corePlaces.length > 0 ? corePlaces : anyPlaces
  const dealt = [
    ...(warm > 0 ? [{ place: WARMUP_PLACE, kind: 'calentament' as const }] : []),
    ...deal(corePlaces, coreCount, 'repte'),
    ...deal(reviewTarget, reviewCount, corePlaces.length > 0 || reviewPlaces.length > 0 ? 'repas' : 'repte'),
  ]
  return { day: input.day, tasks: merge(dealt, seed) }
}
