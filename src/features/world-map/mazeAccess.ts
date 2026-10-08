import type { SkillNode } from '../../core/ambit/types'
import type { SkillState } from '../../core/engine/mastery'

/** A region's Laberint opens once this many of its skills are being learned or mastered. */
export const MIN_SKILLS_FOR_MAZE = 3

const PLAYED = new Set(['aprenent', 'consolidant', 'dominada'])

export interface MazeAccess {
  open: boolean
  /** Skills of the region the maze draws its questions from, in graph order. */
  skillIds: string[]
  /** Skills still needed to open it (0 when open). */
  missing: number
}

export function mazeAccess(regionSkills: readonly SkillNode[], states: Readonly<Record<string, SkillState>>): MazeAccess {
  const skillIds = regionSkills.filter((s) => PLAYED.has(states[s.id]?.status ?? '')).map((s) => s.id)
  return { open: skillIds.length >= MIN_SKILLS_FOR_MAZE, skillIds, missing: Math.max(0, MIN_SKILLS_FOR_MAZE - skillIds.length) }
}

export const mazePath = (skillIds: readonly string[]): string => `/play/laberint-aventura?skills=${skillIds.join(',')}`
