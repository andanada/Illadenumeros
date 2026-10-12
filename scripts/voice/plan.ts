import { assertPlanWithinBudget, totalsOf } from './budget'
import type { Totals } from './budget'
import { assertUniqueKeys, collectTexts, DEFAULT_SEEDS, measureCoverage } from './collect'
import type { Candidate, Selection } from './collect'
import { collectTown, measureTownCoverage } from './town'
import type { PlaceCoverage, TownSelection } from './town'

export interface Plan {
  readonly base: Selection
  readonly town: TownSelection
  /** Question clips followed by the town's, as the generator needs them. */
  readonly selected: readonly Candidate[]
  readonly totals: Totals
}

/** Both selections together: the question clips and the town's. Aborts if the budget or the keys do not hold. */
export function collectAll(options: { seeds?: number } = {}): Plan {
  const seeds = options.seeds ?? DEFAULT_SEEDS
  const base = collectTexts({ seeds })
  const town = collectTown(base.selected, { seeds })
  const selected = [...base.selected, ...town.selected]
  assertUniqueKeys(selected)
  assertPlanWithinBudget(selected)
  return { base, town, selected, totals: totalsOf(selected) }
}

/**
 * Coverage of the question clips and, place by place, of the neighbours' requests. `onDisk` are the texts of clips that
 * already exist (the shipped manifest): they play even when the current selection no longer ranks them.
 */
export function measurePlan(plan: Plan, onDisk: Iterable<string> = []): { questions: ReturnType<typeof measureCoverage>; places: PlaceCoverage[] } {
  const texts = new Set([...plan.selected.map((c) => c.text), ...onDisk])
  return { questions: measureCoverage(plan.base, undefined, texts), places: measureTownCoverage((text) => texts.has(text), plan.town.selected) }
}
