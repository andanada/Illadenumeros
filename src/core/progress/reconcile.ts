import type { SkillNode } from '../ambit/types'
import type { FactState } from '../engine/leitner'
import type { SkillState } from '../engine/mastery'
import { factRetention, retentionPasses } from '../engine/retention'
import { strictTargetFor } from '../engine/thresholds'

/**
 * Statuses are recomputed when progress is read, never rewritten on disk: a stored "dominada" of a core
 * operation skill that does not meet the retention rule (automatised facts + clean days) is shown as
 * "consolidant". Mastery numbers are untouched, and the next answer persists the recomputed status.
 */
export function reconcileStatuses(
  skills: readonly SkillNode[],
  skillStates: Readonly<Record<string, SkillState>>,
  factStates: Readonly<Record<string, FactState | undefined>>,
  cleanDays: Readonly<Record<string, readonly string[]>>,
  factsForSkill: (skillId: string) => string[],
): Record<string, SkillState> {
  const downgraded = skills.flatMap((skill) => {
    const state = skillStates[skill.id]
    if (!state || state.status !== 'dominada' || skill.operation === undefined || !skill.hasFacts) return []
    const share = factRetention(factsForSkill(skill.id), factStates, strictTargetFor(skill.operation)).share
    const gate = { share, cleanDays: cleanDays[skill.id]?.length ?? 0 }
    return retentionPasses(gate, 'keep') ? [] : [{ ...state, status: 'consolidant' as const }]
  })
  if (downgraded.length === 0) return skillStates as Record<string, SkillState>
  return { ...skillStates, ...Object.fromEntries(downgraded.map((s) => [s.skillId, s])) }
}
