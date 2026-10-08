import { groupsOf, type TableFact } from '../shared/tables/tableFact'

/** Area model: `rows` rows of `cols` flowers (multiplication) or `total` flowers shared in `rows` equal rows (division). */
export type GardenPlan = { readonly mode: 'area'; readonly rows: number; readonly cols: number } | { readonly mode: 'share'; readonly rows: number; readonly total: number }

export function gardenPlan(fact: TableFact): GardenPlan {
  if (fact.kind === 'mul') return { mode: 'area', rows: fact.a, cols: fact.b }
  return { mode: 'share', rows: fact.divisor, total: fact.dividend }
}

/** Taps needed to finish: one per row (area) or one per flower in each row (share). */
export const stepsNeeded = (plan: GardenPlan): number => (plan.mode === 'area' ? plan.rows : plan.total / plan.rows)

/** Columns drawn in the garden: the width of a row once fully planted. */
export const gardenCols = (plan: GardenPlan): number => (plan.mode === 'area' ? plan.cols : plan.total / plan.rows)

/** Flowers in the ground after `step` taps. */
export const plantedCount = (plan: GardenPlan, step: number): number => (plan.mode === 'area' ? step * plan.cols : step * plan.rows)

/** Rows with flowers (area: planted rows; share: all rows once the first flower is dealt). */
export const rowsWithFlowers = (plan: GardenPlan, step: number): number => (plan.mode === 'area' ? Math.min(step, plan.rows) : step > 0 ? plan.rows : 0)

/** Whether the cell (row, col), 0-based, holds a flower after `step` taps. */
export function hasFlower(plan: GardenPlan, step: number, row: number, col: number): boolean {
  return plan.mode === 'area' ? row < step : col < step
}

export function gardenCaption(plan: GardenPlan, step: number, showTotal: boolean): string {
  if (plan.mode === 'area') {
    if (step === 0) return `Planta ${plan.rows} files de ${plan.cols} flors`
    const base = `${step} ${step === 1 ? 'fila' : 'files'} de ${plan.cols}`
    return showTotal ? `${base} = ${step * plan.cols} flors` : base
  }
  if (step === 0) return `Reparteix ${plan.total} flors en ${plan.rows} files iguals`
  const base = `${step} ${step === 1 ? 'flor' : 'flors'} a cada fila`
  return showTotal ? `${base}: ${step * plan.rows} de ${plan.total} flors` : base
}

export const buttonLabel = (plan: GardenPlan): string => (plan.mode === 'area' ? 'Planta una fila' : 'Una flor a cada fila')

export function questionLine(fact: TableFact): string {
  const { groups, size } = groupsOf(fact)
  return fact.kind === 'mul' ? `Quantes flors hi ha en ${groups} files de ${size}?` : 'Quantes flors té cada fila?'
}
