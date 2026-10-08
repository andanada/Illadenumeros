import type { SkillNode } from '../ambit/types'
import type { Rng } from '../rng'
import { isUnlocked } from './graph'
import type { FactState } from './leitner'
import { inFlightCount } from './selectorFacts'
import { isIntroductionBlocked, isSkillOpen } from './operationOrder'
import type { Selection } from './sessionSelector'
import { MASTERY_THRESHOLDS } from './thresholds'
import type { SkillState } from './mastery'

export interface QueuedSelection {
  afterN: number
  selection: Selection
}

export interface FamilyInput {
  /** The fact that was just practised. */
  factKey: string
  familyOf: (factKey: string) => string[]
  ownerOf: (factKey: string) => string | undefined
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState>>
  factStates: Readonly<Record<string, FactState>>
  /** Skills the current game can show. */
  restrictTo?: readonly string[]
  recent: readonly boolean[]
  /** Questions asked so far in this session. */
  counter: number
  queued: readonly QueuedSelection[]
  rng: Rng
  /** Current time; a mature partner is only brought back when its review is due. */
  now?: number
  /** Questions asked so far in this session (a fact already asked twice is not scheduled again). */
  history?: readonly { factKey?: string }[]
  /** Set for commutative facts (a + b, a x b): the order the child just saw, so the twin comes in the other one. */
  shownOrder?: 'asc' | 'desc'
}

const { session } = MASTERY_THRESHOLDS

const inFlightKeys = (factStates: Readonly<Record<string, FactState>>): string[] =>
  Object.values(factStates)
    .filter((f) => f.attempts > 0 && (f.box === 0 || f.streak < MASTERY_THRESHOLDS.leitner.inFlightStreak))
    .map((f) => f.factKey)

const accuracy = (recent: readonly boolean[]): number => {
  const window = recent.slice(-session.accuracyWindow)
  return window.length < 4 ? 0.8 : window.filter(Boolean).length / window.length
}

/**
 * Family partners (8+5 -> 13-5, 13-8; 7x8 -> 56:7, 56:8) come back 2-4 questions later, never back-to-back.
 * Unseen partners count as new facts: they are only brought in while fewer than 3 facts are in flight,
 * accuracy is fine, and their operation is already open (strict add -> sub -> mul -> div order).
 */
export function planFamilyPartners(input: FamilyInput): QueuedSelection[] {
  const { skills, skillStates, factStates } = input
  const room = session.maxQueued - input.queued.length
  // A mature fact (box 4+) needs no companion drilling: its partners come back on their own schedule.
  if (room <= 0 || (factStates[input.factKey]?.box ?? 0) >= MASTERY_THRESHOLDS.core.factMinBox) return []
  const askedToday = (key: string): number => (input.history ?? []).filter((h) => h.factKey === key).length
  const queuedKeys = new Set(input.queued.map((q) => q.selection.factKey))
  const taken = new Set(input.queued.map((q) => q.afterN))
  const lowAccuracy = accuracy(input.recent) < session.lowAccuracy
  let unseenBudget = Math.max(0, session.maxFactsInFlight - inFlightKeys(factStates).length)
  const unlocked = (s: SkillNode): boolean => isUnlocked(s, (id) => skillStates[id]?.mastery ?? 0)

  const plan: QueuedSelection[] = []
  const nextSlot = (): number => {
    let slot = input.counter + input.rng.int(session.familyGapMin, session.familyGapMax)
    while (taken.has(slot)) slot += 1
    taken.add(slot)
    return slot
  }

  for (const key of input.rng.shuffle(input.familyOf(input.factKey))) {
    if (plan.length >= Math.min(session.maxFamilyPartnersQueued, room)) break
    const ownerId = input.ownerOf(key)
    const owner = skills.find((s) => s.id === ownerId)
    if (!owner || queuedKeys.has(key) || askedToday(key) >= session.maxAsksPerSession) continue
    if (input.restrictTo !== undefined && !input.restrictTo.includes(owner.id)) continue
    if (!isSkillOpen(owner, skills, skillStates, unlocked)) continue
    const state = factStates[key]
    const isSeen = state !== undefined && state.attempts > 0
    if (isSeen && state.box >= MASTERY_THRESHOLDS.core.factMinBox && state.dueAt > (input.now ?? 0)) continue
    if (!isSeen) {
      if (lowAccuracy || unseenBudget <= 0 || isIntroductionBlocked(owner, skills, skillStates)) continue
      unseenBudget -= 1
    }
    plan.push({ afterN: nextSlot(), selection: { skillId: owner.id, factKey: key, mode: 'repas' } })
  }

  const ownTwin = input.shownOrder !== undefined ? input.ownerOf(input.factKey) : undefined
  if (plan.length < room && ownTwin !== undefined && !queuedKeys.has(input.factKey) && askedToday(input.factKey) < session.maxAsksPerSession && (input.restrictTo === undefined || input.restrictTo.includes(ownTwin))) {
    const order = input.shownOrder === 'asc' ? 'desc' : 'asc'
    plan.push({ afterN: nextSlot(), selection: { skillId: ownTwin, factKey: input.factKey, mode: 'repas', order } })
  }
  return plan
}

/** A planned follow-up whose fact is still unseen must respect the limit of 3 facts in flight at the moment it is served. */
export function isFollowUpStillValid(
  queued: QueuedSelection,
  ctx: { skills: readonly SkillNode[]; factStates: Readonly<Record<string, FactState>>; factsForSkill: (skillId: string) => string[] },
): boolean {
  const key = queued.selection.factKey
  if (key === undefined || (ctx.factStates[key]?.attempts ?? 0) > 0) return true
  return inFlightCount(ctx) < session.maxFactsInFlight
}
