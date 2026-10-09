import { MATES_SKILLS } from '../../ambits/mates/skills'
import { OPERATION_IDS, type OperationId, type SkillNode } from '../../core/ambit/types'
import type { SkillState } from '../../core/engine/mastery'
import { introducibleOperations } from '../../core/engine/operationOrder'
import { isRegionClosed, skillsOfRegion } from '../../features/world-map/stops'
import type { PlaceModule, PlaceUnlock } from './types'

/** What the unlock rules read from the child's progress. */
export interface UnlockProgress {
  readonly skillStates: Readonly<Record<string, SkillState>>
}

/** A skill the child has really begun (the diagnostic placed it or she practised it). */
const STARTED: ReadonlySet<SkillState['status']> = new Set(['aprenent', 'consolidant', 'dominada'])

/**
 * An operation has started when the engine's strict order (add → sub → mul → div) lets its new facts in
 * AND at least one of its fact skills is under way.
 */
function operationStarted(op: OperationId, skills: readonly SkillNode[], states: UnlockProgress['skillStates']): boolean {
  if (!introducibleOperations(skills, states).has(op)) return false
  return skills.some((s) => s.operation === op && STARTED.has(states[s.id]?.status ?? 'nova'))
}

/** The region of that grade is open (same rule the island map used: some stop is no longer locked). */
function gradeOpen(grade: 5, skills: readonly SkillNode[], states: UnlockProgress['skillStates']): boolean {
  const regionSkills = skillsOfRegion(skills, { grade })
  return regionSkills.length > 0 && !isRegionClosed(regionSkills, states)
}

/** Pure: is this place open for this child? Closed places show scaffolding and «Obrim aviat!» (never a padlock). */
export function isPlaceOpen(place: Pick<PlaceModule, 'unlock'>, progress: UnlockProgress, skills: readonly SkillNode[] = MATES_SKILLS): boolean {
  const { unlock } = place
  if (unlock === 'always') return true
  if ('operation' in unlock) return operationStarted(unlock.operation, skills, progress.skillStates)
  return gradeOpen(unlock.grade, skills, progress.skillStates)
}

const OP_NAMES: Readonly<Record<OperationId, string>> = { add: 'les sumes', sub: 'les restes', mul: 'les multiplicacions', div: 'les divisions' }

/** «les sumes», «les sumes i les restes», «les sumes, les restes i les multiplicacions». */
const listOf = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} i ${names[names.length - 1] ?? ''}`

/** For the adults' page only: what opens a place, in plain words. `undefined` = a place not built yet. */
export function unlockHint(unlock: PlaceUnlock | undefined): string {
  if (unlock === undefined) return 'Encara en construcció'
  if (unlock === 'always') return 'Obert des del primer dia'
  if ('grade' in unlock) return 'S’obre amb els continguts de 5è'
  const earlier = OPERATION_IDS.slice(0, OPERATION_IDS.indexOf(unlock.operation)).map((op) => OP_NAMES[op])
  const own = OP_NAMES[unlock.operation]
  return earlier.length === 0 ? `S’obre quan comenci a treballar ${own}` : `S’obre quan domini ${listOf(earlier)} i comenci ${own}`
}
