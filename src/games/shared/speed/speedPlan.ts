import type { SkillNode } from '../../../core/ambit/types'
import { isUnlocked } from '../../../core/engine/graph'
import { isFluent, type FactState } from '../../../core/engine/leitner'
import type { SkillState } from '../../../core/engine/mastery'
import { MASTERY_THRESHOLDS } from '../../../core/engine/thresholds'
import type { Rng } from '../../../core/rng'

export const MAX_NEW_FACTS = 3
const REVIEW_SHARE = 0.7
const NEW_SHARE = 0.1
const REVIEW_MIN_BOX = 2

export type PlanKind = 'review' | 'consolidation' | 'new'

export interface PlannedFact {
  factKey: string
  skillId: string
  kind: PlanKind
}

export interface PlanInput {
  /** Fact skills of the operation, in graph order (data: switch operation by passing another one). */
  operation: { readonly skillIds: readonly string[] }
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState>>
  factStates: Readonly<Record<string, FactState>>
  factsForSkill: (skillId: string) => string[]
  /** Skills the host allows (e.g. the daily mission). */
  restrictTo?: readonly string[]
  count: number
  rng: Rng
}

/** Skills of the operation the child can play now: started, or with their prerequisites known. */
export function openSkills(input: PlanInput): SkillNode[] {
  const masteryOf = (id: string): number => input.skillStates[id]?.mastery ?? 0
  const own = input.operation.skillIds
    .map((id) => input.skills.find((s) => s.id === id))
    .filter((s): s is SkillNode => s !== undefined && s.hasFacts)
    .filter((s) => input.restrictTo === undefined || input.restrictTo.includes(s.id))
  const open = own.filter((s) => {
    const state = input.skillStates[s.id]
    return (state !== undefined && state.status !== 'bloquejada') || isUnlocked(s, masteryOf)
  })
  // A game that only knows locked skills still shows something of its own (same rule as the selector).
  const fallback = own[0]
  return open.length > 0 ? open : fallback ? [fallback] : []
}

type Groups = Record<PlanKind, PlannedFact[]>

function classify(input: PlanInput, skills: readonly SkillNode[]): Groups {
  const groups: Groups = { review: [], consolidation: [], new: [] }
  for (const skill of skills) {
    const target = skill.fluencyTargetMs * MASTERY_THRESHOLDS.leitner.fluencyLeniency
    for (const factKey of input.factsForSkill(skill.id)) {
      const state = input.factStates[factKey]
      const kind: PlanKind =
        state === undefined || state.attempts === 0 ? 'new' : state.box >= REVIEW_MIN_BOX && !isFluent(state, target) ? 'review' : 'consolidation'
      groups[kind] = [...groups[kind], { factKey, skillId: skill.id, kind }]
    }
  }
  return groups
}

/** Moves equal neighbours apart when another fact is available (pure, keeps the multiset). */
export function spreadDuplicates(plan: readonly PlannedFact[]): PlannedFact[] {
  const out = [...plan]
  const clashes = (i: number, key: string): boolean => out[i - 1]?.factKey === key || out[i + 1]?.factKey === key
  for (let i = 1; i < out.length; i++) {
    const current = out[i] as PlannedFact
    if (current.factKey !== out[i - 1]?.factKey) continue
    const swap = out.findIndex((p, k) => k !== i && p.factKey !== current.factKey && !clashes(i, p.factKey) && !clashes(k, current.factKey))
    if (swap === -1) continue
    out[i] = out[swap] as PlannedFact
    out[swap] = current
  }
  return out
}

/**
 * Picks the facts of one speed round for an operation: ~70 % review of slow facts already in box 2+,
 * ~20 % consolidation, at most 10 % (and never more than 3 distinct) new facts. Shortfalls are filled
 * from the next category; the list is cycled when the child knows fewer facts than questions.
 */
export function planRoundFacts(input: PlanInput): PlannedFact[] {
  const { count, rng } = input
  const groups = classify(input, openSkills(input))
  const shuffled: Groups = { review: rng.shuffle(groups.review), consolidation: rng.shuffle(groups.consolidation), new: rng.shuffle(groups.new) }
  const wantReview = Math.round(count * REVIEW_SHARE)
  const wantNew = Math.min(MAX_NEW_FACTS, Math.floor(count * NEW_SHARE))

  const review = shuffled.review.slice(0, wantReview)
  const fresh = shuffled.new.slice(0, wantNew)
  const consolidation = shuffled.consolidation.slice(0, Math.max(0, count - review.length - fresh.length))
  const filled = [...review, ...fresh, ...consolidation]
  // Still short: more slow facts, then (a brand new learner) new ones up to the cap of 3.
  const withReview = filled.length < count ? [...filled, ...shuffled.review.slice(review.length)] : filled
  const spareNew = shuffled.new.slice(fresh.length, MAX_NEW_FACTS)
  const pool = withReview.length < count ? [...withReview, ...spareNew] : withReview

  const base = pool.length > 0 ? pool : shuffled.new.slice(0, MAX_NEW_FACTS)
  const cycled = Array.from({ length: count }, (_, i) => base[i % Math.max(base.length, 1)]).filter((p): p is PlannedFact => p !== undefined)
  return spreadDuplicates(rng.shuffle(cycled))
}
