import { OPERATION_IDS, type OperationId } from '../../core/ambit/types'
import { factsForSkill } from './facts'
import { parseFactKey } from './generators/itemFactory'

export { OPERATION_IDS, type OperationId }

export interface Operation {
  id: OperationId
  /** Plural noun for the adult dashboard ("Sumes"). */
  label: string
  /** Fact skills of the operation, in graph order. */
  skillIds: readonly string[]
}

/** Core operations in the strict order in which NEW material is introduced. */
export const OPERATIONS: readonly Operation[] = [
  { id: 'add', label: 'Sumes', skillIds: ['A4', 'A5', 'A7', 'A8'] },
  { id: 'sub', label: 'Restes', skillIds: ['A6', 'A9'] },
  { id: 'mul', label: 'Multiplicacions', skillIds: ['C4', 'C5', 'D2', 'D3'] },
  { id: 'div', label: 'Divisions', skillIds: ['C7', 'D4'] },
]

const ALL_FACT_SKILLS: readonly string[] = OPERATIONS.flatMap((op) => op.skillIds)

export const isCoreFactSkill = (skillId: string): boolean => ALL_FACT_SKILLS.includes(skillId)

export function operationOfSkill(skillId: string): OperationId | undefined {
  return OPERATIONS.find((op) => op.skillIds.includes(skillId))?.id
}

export const operationIndex = (id: OperationId): number => OPERATION_IDS.indexOf(id)

const OWNERS: ReadonlyMap<string, string> = new Map(ALL_FACT_SKILLS.flatMap((skillId) => factsForSkill(skillId).map((key) => [key, skillId] as const)))

/** Skill that owns a fact key, if the fact is tracked. */
export const factOwner = (factKey: string): string | undefined => OWNERS.get(factKey)

/** Operation a fact key belongs to, from its prefix (c10 friends are additions). */
export function operationOfFact(factKey: string): OperationId | undefined {
  const kind = parseFactKey(factKey)?.kind
  if (kind === 'c10') return 'add'
  return kind === 'add' || kind === 'sub' || kind === 'mul' || kind === 'div' ? kind : undefined
}
