import { groupsOf, repeatedSum, type TableFact } from '../shared/tables/tableFact'

/** A tower: `floors` floors of `size` blocks. Multiplication builds `floors` of them; division builds until `total` blocks. */
export interface TowerPlan {
  readonly kind: 'mul' | 'div'
  readonly size: number
  readonly floors: number
  readonly total: number
}

export function towerPlan(fact: TableFact): TowerPlan {
  const { groups, size, total } = groupsOf(fact)
  return { kind: fact.kind, size, floors: groups, total }
}

/** Floors the child has to build before the question (always the full tower). */
export const floorsToBuild = (plan: TowerPlan): number => plan.floors

export const blocksAfter = (plan: TowerPlan, built: number): number => Math.min(built, plan.floors) * plan.size

export const isBuilt = (plan: TowerPlan, built: number): boolean => built >= plan.floors

/** Tape of the repeated addition ("4 + 4 + 4"), with the running total when asked. */
export function sumTape(plan: TowerPlan, built: number, showTotal: boolean): string {
  if (built <= 0) return `Plantes de ${plan.size} blocs`
  const sum = repeatedSum(plan.size, built)
  return showTotal ? `${sum} = ${built * plan.size}` : sum
}

export function floorCaption(plan: TowerPlan, built: number): string {
  if (built === 0) return plan.kind === 'mul' ? `Construeix ${plan.floors} plantes de ${plan.size} blocs` : `Construeix la torre de ${plan.total} blocs amb plantes de ${plan.size}`
  return `${built} ${built === 1 ? 'planta' : 'plantes'}`
}

export const questionLine = (plan: TowerPlan): string =>
  plan.kind === 'mul' ? `Quants blocs té la torre de ${plan.floors} plantes de ${plan.size}?` : `Quantes plantes de ${plan.size} blocs té la torre de ${plan.total}?`

/** Floors drawn from the bottom up as rows of `size` blocks. */
export const floorRows = (plan: TowerPlan, built: number): number[] => Array.from({ length: Math.min(built, plan.floors) }, () => plan.size)
