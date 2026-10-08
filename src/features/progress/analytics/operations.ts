import { factsForSkill } from '../../../ambits/mates/facts'
import { OPERATIONS } from '../../../ambits/mates/operations'
import type { OperationId, SkillNode } from '../../../core/ambit/types'
import type { FactState } from '../../../core/engine/leitner'
import type { SkillState } from '../../../core/engine/mastery'
import { factRetention } from '../../../core/engine/retention'
import { MASTERY_THRESHOLDS, strictTargetFor } from '../../../core/engine/thresholds'

export type OperationState = 'dominada' | 'en-curs' | 'esperant'

export interface OperationSummary {
  id: OperationId
  label: string
  total: number
  automatised: number
  /** Practised but not automatised yet. */
  inReview: number
  unseen: number
  state: OperationState
  /** "Sumes: 63 de 100 automatitzades". */
  headline: string
  /** One honest sentence (no dates, no promises). */
  note: string
}

/** Wording of each operation inside a sentence ("les sumes", "les restes"). */
const THE: Record<OperationId, string> = { add: 'les sumes', sub: 'les restes', mul: 'les multiplicacions', div: 'les divisions' }
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)
const percent = Math.round(MASTERY_THRESHOLDS.core.gainShare * 100)

export const operationWaitingNote = (waiting: Pick<OperationSummary, 'id'>, previous: Pick<OperationSummary, 'id'>): string =>
  `${cap(THE[waiting.id])} s’obriran quan ${THE[previous.id]} estiguin al ${percent} %.`

/** Per operation: how many of its facts are automatised, in review or not started, and where it stands in the order. */
export function buildOperationSummaries(
  skills: readonly SkillNode[],
  skillStates: Readonly<Record<string, SkillState | undefined>>,
  factStates: Readonly<Record<string, FactState | undefined>>,
): OperationSummary[] {
  const rows = OPERATIONS.map((op) => {
    const ownSkills = skills.filter((s) => s.operation === op.id)
    const keys = ownSkills.flatMap((s) => factsForSkill(s.id))
    const retention = factRetention(keys, factStates, strictTargetFor(op.id))
    const mastered = ownSkills.length > 0 && ownSkills.every((s) => skillStates[s.id]?.status === 'dominada')
    return { op, retention, mastered }
  })
  const current = rows.findIndex((r) => !r.mastered)
  return rows.map(({ op, retention, mastered }, index) => {
    const state: OperationState = mastered ? 'dominada' : index === current ? 'en-curs' : 'esperant'
    const previous = rows[index - 1]
    const note =
      state === 'dominada'
        ? `${cap(THE[op.id])} ja estan dominades: es continuen repassant de tant en tant.`
        : state === 'en-curs'
          ? 'És l’operació en què s’està treballant ara. Compta que la resposta sigui segura, ràpida i es mantingui en el temps.'
          : previous
            ? operationWaitingNote(op, previous.op)
            : ''
    return {
      id: op.id,
      label: op.label,
      total: retention.total,
      automatised: retention.automatised,
      inReview: retention.inReview,
      unseen: retention.unseen,
      state,
      headline: `${op.label}: ${retention.automatised} de ${retention.total} automatitzades`,
      note,
    }
  })
}
