import { MATES_SKILLS } from '../../ambits/mates/skills'
import type { OperationId, SkillNode } from '../../core/ambit/types'
import type { SkillState } from '../../core/engine/mastery'
import { introducibleOperations } from '../../core/engine/operationOrder'
import { starsFor, stopStatus, type Stars } from '../world-map/stops'

export const GAME_GROUPS = ['sumar', 'restar', 'multiplicar', 'dividir', 'pensar'] as const
export type GameGroup = (typeof GAME_GROUPS)[number]

export const GROUP_TITLE: Readonly<Record<GameGroup, { title: string; emoji: string }>> = {
  sumar: { title: 'Sumar', emoji: '➕' },
  restar: { title: 'Restar', emoji: '➖' },
  multiplicar: { title: 'Multiplicar', emoji: '✖️' },
  dividir: { title: 'Dividir', emoji: '➗' },
  pensar: { title: 'Pensar i barrejar', emoji: '🧠' },
}

/** Where the games we know of live in the hall. A new game that is not listed is placed by its skills (see `groupOf`). */
const KNOWN_GROUP: Readonly<Record<string, GameGroup>> = {
  'tren-sumes': 'sumar',
  'pesca-sumes': 'sumar',
  bombolles: 'sumar',
  'marc-magic': 'sumar',
  'cursa-recta': 'restar',
  'fleca-files': 'multiplicar',
  llaminadures: 'dividir',
}

/**
 * Skills a game serves when the skill list does not say so itself (games that mix everything).
 * A game is open as soon as one of its skills is open, so the strict add -> sub -> mul -> div order carries over.
 */
const EXTRA_SKILLS: Readonly<Record<string, readonly string[]>> = {
  'laberint-aventura': ['A4', 'A6', 'A9', 'B7', 'C2', 'C4'],
  'detectiu-errors': ['A4', 'A8', 'A9', 'B5', 'B6', 'B7', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4'],
  'contes-numeros': ['A4', 'A6', 'A9', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4', 'C10'],
  'escape-room': ['A4', 'A6', 'A8', 'A9', 'B5', 'B6', 'B7', 'C2', 'C4', 'C7'],
}

export function servedSkills(gameId: string, skills: readonly SkillNode[] = MATES_SKILLS): SkillNode[] {
  const extra = EXTRA_SKILLS[gameId] ?? []
  return skills.filter((s) => s.games.some((g) => g === gameId) || extra.includes(s.id))
}

/** The operation row of the hall: known games by name, others by the single operation their skills practise, else "pensar". */
export function groupOf(gameId: string, skills: readonly SkillNode[] = MATES_SKILLS): GameGroup {
  const known = KNOWN_GROUP[gameId]
  if (known) return known
  const operations = new Set(servedSkills(gameId, skills).map((s) => s.operation))
  const [only] = [...operations]
  if (operations.size === 1 && only === 'add') return 'sumar'
  if (operations.size === 1 && only === 'sub') return 'restar'
  if (operations.size === 1 && only === 'mul') return 'multiplicar'
  if (operations.size === 1 && only === 'div') return 'dividir'
  return 'pensar'
}

type States = Readonly<Record<string, SkillState>>

const GROUP_OPERATION: Readonly<Partial<Record<GameGroup, OperationId>>> = { sumar: 'add', restar: 'sub', multiplicar: 'mul', dividir: 'div' }

/**
 * Open when at least one skill it serves can be played AND, for the games of one operation, that operation is
 * already open in the strict order add -> sub -> mul -> div (even when its concept skills have no facts).
 */
export function isGameUnlocked(gameId: string, states: States, skills: readonly SkillNode[] = MATES_SKILLS): boolean {
  const operation = GROUP_OPERATION[groupOf(gameId, skills)]
  if (operation !== undefined && !introducibleOperations(skills, states).has(operation)) return false
  const served = servedSkills(gameId, skills)
  if (served.length === 0) return true
  return served.some((s) => stopStatus(s, states) !== 'locked')
}

/** Best level reached on any skill the game serves (0 to 3 stars). */
export function gameStars(gameId: string, states: States, skills: readonly SkillNode[] = MATES_SKILLS): Stars {
  return servedSkills(gameId, skills).reduce<Stars>((best, s) => Math.max(best, starsFor(states[s.id])) as Stars, 0)
}

export interface HallGame {
  id: string
  unlocked: boolean
  stars: Stars
}

export interface HallSection {
  group: GameGroup
  games: HallGame[]
}

/** All games grouped by operation, in a stable order; empty groups are left out. */
export function buildHall(gameIds: readonly string[], states: States, skills: readonly SkillNode[] = MATES_SKILLS): HallSection[] {
  return GAME_GROUPS.map((group) => ({
    group,
    games: gameIds
      .filter((id) => groupOf(id, skills) === group)
      .map((id) => ({ id, unlocked: isGameUnlocked(id, states, skills), stars: gameStars(id, states, skills) })),
  })).filter((section) => section.games.length > 0)
}

/** "Joc sorpresa": any open game, `roll` in [0, 1). Undefined when nothing is open. */
export function pickSurprise(sections: readonly HallSection[], roll: number): string | undefined {
  const open = sections.flatMap((s) => s.games).filter((g) => g.unlocked)
  if (open.length === 0) return undefined
  return open[Math.min(open.length - 1, Math.floor(Math.max(0, roll) * open.length))]?.id
}
