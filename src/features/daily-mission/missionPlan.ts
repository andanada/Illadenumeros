import type { SkillNode } from '../../core/ambit/types'
import { factsForSkill } from '../../ambits/mates/facts'
import { OPERATION_IDS } from '../../core/ambit/types'
import { isUnlocked } from '../../core/engine/graph'
import type { FactState } from '../../core/engine/leitner'
import type { SkillState } from '../../core/engine/mastery'
import { coreOperation, isIntroductionBlocked } from '../../core/engine/operationOrder'
import { focusSkill } from '../../core/engine/sessionSelector'
import { MASTERY_THRESHOLDS } from '../../core/engine/thresholds'

export const WARMUP_GAME = 'duel-llampec'
export const REVIEW_GAME = 'repte-illa'
export const MISSION_ROUNDS = 6
export const ALL_GAMES = ['repte-illa', 'duel-llampec', 'tren-sumes', 'pesca-sumes', 'bombolles', 'marc-magic', 'cursa-recta', 'fleca-files', 'llaminadures', 'botiga-pluja', 'numero-amagat', 'pastis-fraccions'] as const

export interface MissionStep {
  id: 'calentament' | 'repte' | 'lliure' | 'repas'
  label: string
  emoji: string
  /** Fixed game, or undefined when the child chooses (see `options`). */
  gameId: string | undefined
  options: readonly string[]
  skillIds: readonly string[] | undefined
  maxRounds: number | undefined
}

/** Games that only make sense with their own skills (never offered as filler). */
const isNewGame = (g: string): boolean => g === 'fleca-files' || g === 'llaminadures' || g === 'botiga-pluja' || g === 'numero-amagat' || g === 'pastis-fraccions'

const pick = <T,>(items: readonly T[], seed: number): T | undefined => items[Math.abs(seed) % Math.max(items.length, 1)]

/** Builds the 4 steps of the daily mission. `seed` (e.g. the day number) rotates games so days feel different. */
export function buildMissionPlan(
  skills: readonly SkillNode[],
  states: Readonly<Record<string, SkillState>>,
  seed: number,
  factStates: Readonly<Record<string, FactState>> = {},
): MissionStep[] {
  const masteryOf = (id: string): number => states[id]?.mastery ?? 0
  // New fact skills of an operation that is not open yet (strict add, sub, mul, div) are not offered.
  const available = skills.filter((s) => states[s.id] !== undefined || (isUnlocked(s, masteryOf) && !isIntroductionBlocked(s, skills, states)))

  const focus = skills.find((s) => s.id === focusSkill(skills, states))
  const conceptual = (focus?.games ?? []).filter((g) => g !== WARMUP_GAME)
  const conceptualGame = pick(conceptual.length > 0 ? conceptual : (focus?.games ?? []), seed) ?? REVIEW_GAME

  const warmupPool = available.filter((s) => s.games.includes(WARMUP_GAME))
  // Fluency warm-up: only skills that already have a fact in box 2 or higher (nothing brand new in the duel).
  const known = warmupPool.filter((s) => factsForSkill(s.id).some((k) => (factStates[k]?.box ?? 0) >= MASTERY_THRESHOLDS.mission.warmupMinBox && (factStates[k]?.attempts ?? 0) > 0))
  const warmupSkills = (known.length > 0 ? known : warmupPool).map((s) => s.id)
  const reviewSkills = reviewScope(skills, available, states)
  const playable = ALL_GAMES.filter((g) => g !== conceptualGame)
  const relevant = playable.filter((g) => available.some((s) => s.games.includes(g)))
  // Prefer games that fit the skills the child can already play; pad with the rest so there are always 3 options.
  const rotated = relevant.length >= 3 ? relevant : [...relevant, ...playable.filter((g) => !relevant.includes(g) && !isNewGame(g))]
  const start = Math.abs(seed) % Math.max(rotated.length, 1)
  const options = [...rotated.slice(start), ...rotated.slice(0, start)].slice(0, 3)

  return [
    { id: 'calentament', label: 'Calentament', emoji: '⚡', gameId: WARMUP_GAME, options: [], skillIds: warmupSkills.length > 0 ? warmupSkills : undefined, maxRounds: undefined },
    { id: 'repte', label: 'El repte', emoji: '🧠', gameId: conceptualGame, options: [], skillIds: focus ? [focus.id] : undefined, maxRounds: MISSION_ROUNDS },
    { id: 'lliure', label: 'Tria tu', emoji: '🎲', gameId: undefined, options, skillIds: available.length > 0 ? available.map((s) => s.id) : undefined, maxRounds: MISSION_ROUNDS },
    { id: 'repas', label: 'Repàs', emoji: '🔁', gameId: REVIEW_GAME, options: [], skillIds: reviewSkills.length > 0 ? reviewSkills : undefined, maxRounds: MISSION_ROUNDS },
  ]
}

/** The review step: the operation in progress plus the earlier ones (spaced reviews), never later ones; all skills if none applies. */
function reviewScope(skills: readonly SkillNode[], available: readonly SkillNode[], states: Readonly<Record<string, SkillState>>): string[] {
  const core = coreOperation(skills, states)
  if (core === undefined) return available.map((s) => s.id)
  const upTo = OPERATION_IDS.indexOf(core)
  const scope = available.filter((s) => s.operation !== undefined && OPERATION_IDS.indexOf(s.operation) <= upTo)
  return (scope.length > 0 ? scope : available).map((s) => s.id)
}
