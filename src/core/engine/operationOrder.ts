import { OPERATION_IDS, type OperationId, type SkillNode } from '../ambit/types'
import type { SkillState } from './mastery'

type States = Readonly<Record<string, SkillState | undefined>>

const factSkillsOf = (skills: readonly SkillNode[], op: OperationId): SkillNode[] => skills.filter((s) => s.operation === op)

const isOperationMastered = (skills: readonly SkillNode[], states: States, op: OperationId): boolean =>
  factSkillsOf(skills, op).every((s) => states[s.id]?.status === 'dominada')

/**
 * Operations whose NEW facts may be introduced: an operation opens when every earlier one
 * (add -> sub -> mul -> div) has all its fact skills "dominada" under the strict rule.
 */
export function introducibleOperations(skills: readonly SkillNode[], states: States): Set<OperationId> {
  const open = new Set<OperationId>()
  for (const op of OPERATION_IDS) {
    open.add(op)
    if (factSkillsOf(skills, op).length > 0 && !isOperationMastered(skills, states, op)) break
  }
  return open
}

/** The operation in progress: the first one that is not fully mastered yet. */
export function coreOperation(skills: readonly SkillNode[], states: States): OperationId | undefined {
  return OPERATION_IDS.find((op) => factSkillsOf(skills, op).length > 0 && !isOperationMastered(skills, states, op))
}

/** True when the skill's operation is not open yet: its facts must not be introduced (reviews of seen facts are fine). */
export function isIntroductionBlocked(skill: SkillNode, skills: readonly SkillNode[], states: States): boolean {
  return skill.operation !== undefined && !introducibleOperations(skills, states).has(skill.operation)
}

/** Same as before: a skill with only "aprenent" is not served until its prerequisites are reached. */
const STARTED: ReadonlySet<string> = new Set(['consolidant', 'dominada'])

/** A skill the child can work on: already started, or unlocked by the graph and its operation is open. */
export function isSkillOpen(skill: SkillNode, skills: readonly SkillNode[], states: States, isUnlockedByGraph: (skill: SkillNode) => boolean): boolean {
  const own = states[skill.id]
  if (own && STARTED.has(own.status)) return true
  // A skill already being learned keeps serving its seen facts; only a fresh one is held back by the operation order.
  if (own?.status === 'aprenent') return isUnlockedByGraph(skill)
  return isUnlockedByGraph(skill) && !isIntroductionBlocked(skill, skills, states)
}
