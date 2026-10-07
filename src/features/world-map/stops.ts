import type { SkillNode } from '../../core/ambit/types'
import { isUnlocked } from '../../core/engine/graph'
import type { SkillState } from '../../core/engine/mastery'

export type Stars = 0 | 1 | 2 | 3
export type StopStatus = 'locked' | 'new' | 'started'

/** aprenent = 1, consolidant = 2, dominada = 3; anything else (or unknown) = 0. */
export function starsFor(state: Pick<SkillState, 'status'> | undefined): Stars {
  switch (state?.status) {
    case 'aprenent':
      return 1
    case 'consolidant':
      return 2
    case 'dominada':
      return 3
    default:
      return 0
  }
}

/**
 * A stop is playable when it already has progress (placed by the diagnostic or played)
 * or when all its prerequisites reach the unlock mastery. Unknown + unlocked = new.
 */
export function stopStatus(skill: SkillNode, states: Readonly<Record<string, SkillState>>): StopStatus {
  const own = states[skill.id]
  if (own && own.status !== 'bloquejada') return own.status === 'nova' ? 'new' : 'started'
  return isUnlocked(skill, (id) => states[id]?.mastery ?? 0) ? 'new' : 'locked'
}

export interface Region {
  id: string
  name: string
  grade: 1 | 2 | 3 | 4 | 5
  emoji: string
  /** Soft tint of the region on the map. */
  tint: string
  playable: boolean
}

export const REGIONS: readonly Region[] = [
  { id: 'bosc', name: 'Bosc dels Comptes', grade: 1, emoji: '🌲', tint: '#bbf7d0', playable: true },
  { id: 'platja', name: 'Platja de les Desenes', grade: 2, emoji: '🏖️', tint: '#fde68a', playable: true },
  { id: 'castell', name: 'Fleca-Castell de les Taules', grade: 3, emoji: '🏰', tint: '#fbcfe8', playable: true },
  { id: 'muntanya', name: 'Muntanya dels Milers', grade: 4, emoji: '⛰️', tint: '#bfdbfe', playable: true },
  { id: 'ciutat', name: 'Ciutat dels Decimals', grade: 5, emoji: '🏙️', tint: '#ddd6fe', playable: true },
]

export const GRADE_LABEL: Record<Region['grade'], string> = { 1: '1r', 2: '2n', 3: '3r', 4: '4t', 5: '5è' }

/** Skills of a region (by grade), keeping the order of the skill list. */
export function skillsOfRegion(skills: readonly SkillNode[], region: Pick<Region, 'grade'>): SkillNode[] {
  return skills.filter((s) => s.grade === region.grade)
}

/** Playable regions with their skills; regions without skills are left out so the map never shows an empty island. */
export function playableRegions(skills: readonly SkillNode[]): { region: Region; skills: SkillNode[] }[] {
  return REGIONS.filter((r) => r.playable)
    .map((region) => ({ region, skills: skillsOfRegion(skills, region) }))
    .filter((entry) => entry.skills.length > 0)
}

/** A region whose stops are all still locked (nothing started, no prerequisite reached): the map shows how to open it. */
export function isRegionClosed(skills: readonly SkillNode[], states: Readonly<Record<string, SkillState>>): boolean {
  return skills.length > 0 && skills.every((skill) => stopStatus(skill, states) === 'locked')
}
