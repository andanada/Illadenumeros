import type { SkillNode } from '../../core/ambit/types'
import { isUnlocked } from '../../core/engine/graph'
import type { SkillState } from '../../core/engine/mastery'
import { focusSkill } from '../../core/engine/sessionSelector'

export const WARMUP_GAME = 'duel-llampec'
export const REVIEW_GAME = 'repte-illa'
export const MISSION_ROUNDS = 6
export const ALL_GAMES = ['repte-illa', 'duel-llampec', 'bombolles', 'marc-magic', 'cursa-recta', 'fleca-files', 'llaminadures', 'botiga-pluja'] as const

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
const isNewGame = (g: string): boolean => g === 'fleca-files' || g === 'llaminadures' || g === 'botiga-pluja'

const pick = <T,>(items: readonly T[], seed: number): T | undefined => items[Math.abs(seed) % Math.max(items.length, 1)]

/** Builds the 4 steps of the daily mission. `seed` (e.g. the day number) rotates games so days feel different. */
export function buildMissionPlan(skills: readonly SkillNode[], states: Readonly<Record<string, SkillState>>, seed: number): MissionStep[] {
  const masteryOf = (id: string): number => states[id]?.mastery ?? 0
  const available = skills.filter((s) => states[s.id] !== undefined || isUnlocked(s, masteryOf))

  const focus = skills.find((s) => s.id === focusSkill(skills, states))
  const conceptual = (focus?.games ?? []).filter((g) => g !== WARMUP_GAME)
  const conceptualGame = pick(conceptual.length > 0 ? conceptual : (focus?.games ?? []), seed) ?? REVIEW_GAME

  const warmupSkills = available.filter((s) => s.games.includes(WARMUP_GAME)).map((s) => s.id)
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
    { id: 'repas', label: 'Repàs', emoji: '🔁', gameId: REVIEW_GAME, options: [], skillIds: available.length > 0 ? available.map((s) => s.id) : undefined, maxRounds: MISSION_ROUNDS },
  ]
}
