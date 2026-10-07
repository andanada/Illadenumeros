import type { Grade, SkillNode } from '../../../core/ambit/types'
import { isUnlocked } from '../../../core/engine/graph'
import type { SkillState, SkillStatus } from '../../../core/engine/mastery'

export const GRADE_LABELS: Record<number, string> = { 1: '1r', 2: '2n', 3: '3r', 4: '4t', 5: '5è' }
export const SHOWN_GRADES: readonly Grade[] = [1, 2, 3, 4]

/** Status shown in the heatmap: stored status, or bloquejada when the prerequisites are not reached yet. */
export function skillStatusOf(skill: SkillNode, states: Readonly<Record<string, SkillState | undefined>>): SkillStatus {
  const own = states[skill.id]
  if (own && own.status !== 'nova' && own.status !== 'bloquejada') return own.status
  const unlocked = isUnlocked(skill, (id) => states[id]?.mastery ?? 0)
  return unlocked ? 'nova' : 'bloquejada'
}

export interface GradeGroup {
  grade: Grade
  label: string
  skills: SkillNode[]
}

export function groupByGrade(skills: readonly SkillNode[]): GradeGroup[] {
  return SHOWN_GRADES.map((grade) => ({ grade, label: GRADE_LABELS[grade] ?? String(grade), skills: skills.filter((s) => s.grade === grade) })).filter(
    (g) => g.skills.length > 0,
  )
}
