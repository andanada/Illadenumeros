import { CHARACTER_IDS, type CharacterId } from '../../core/storage/db'

export const DUEL_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9'] as const
export const DUEL_DURATION_MS = 75_000
/** Points the child needs to fill her bar. */
export const GOAL_POINTS = 18
const SLOW_POINTS = 0.5

/** Fact skills allowed in the duel: `skillIds` intersected with A4..A9, falling back to A4. */
export function duelSkills(skillIds: readonly string[] | undefined): string[] {
  if (!skillIds) return [...DUEL_SKILLS]
  const allowed = DUEL_SKILLS.filter((id) => skillIds.includes(id))
  return allowed.length > 0 ? allowed : ['A4']
}

/** A fast correct answer is worth 1 point, a slow one half. */
export function pointsFor(rtMs: number, fluencyTargetMs: number): number {
  return rtMs <= fluencyTargetMs * 1.5 ? 1 : SLOW_POINTS
}

/** Friendly rival pace: a steady jog that stays close to the child, never a threat. */
export function rivalProgress(elapsedMs: number, childProgress: number): number {
  const steady = Math.min(1, elapsedMs / DUEL_DURATION_MS) * 0.8
  return Math.min(0.92, (steady * 2 + childProgress) / 3)
}

export function pickRival(child: CharacterId, seed: number): CharacterId {
  const others = CHARACTER_IDS.filter((c) => c !== child)
  return others[Math.abs(seed) % others.length] ?? 'nyx'
}
