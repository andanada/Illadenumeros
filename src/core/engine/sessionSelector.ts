import type { SkillNode } from '../ambit/types'
import type { Rng } from '../rng'
import { isUnlocked } from './graph'
import type { FactState } from './leitner'
import type { SkillState } from './mastery'
import { coreOperation, isIntroductionBlocked, isSkillOpen } from './operationOrder'
import { isAutomatised } from './retention'
import {
  accuracyOf,
  askedInSession,
  canIntroduce,
  dueFacts,
  inFlightFacts,
  interleave,
  isSeen,
  soonestDue,
  unseenFacts,
  weakestSeen,
  type FactChoice,
  type FactContext,
} from './selectorFacts'
import { MASTERY_THRESHOLDS, strictTargetFor } from './thresholds'

export type SelectionMode = 'repas' | 'consolidacio' | 'nou'

export interface Selection {
  skillId: string
  factKey?: string
  mode: SelectionMode
  /** For commutative facts: which operand goes first ('desc' = the bigger one). */
  order?: 'asc' | 'desc'
}

export interface SelectorInput {
  skills: readonly SkillNode[]
  skillStates: Readonly<Record<string, SkillState>>
  factStates: Readonly<Record<string, FactState>>
  factsForSkill: (skillId: string) => string[]
  /** Results of the current session, most recent last. */
  recent: readonly boolean[]
  now: number
  rng: Rng
  /** Skills the current game can show; defaults to all. */
  restrictTo?: readonly string[]
  /** Questions already asked in this session, most recent last (interleaving, no back-to-back repeats). */
  history?: readonly { skillId: string; factKey?: string }[]
  /** Fluency warm-up: only facts already in this Leitner box or above. */
  minBox?: number
}

const { session, mission } = MASTERY_THRESHOLDS
const NEW_FACT_CHANCE_WHEN_BUSY = 0.35
const CORE_INTRO_FIRST = 0.3
const WEAKEST_POOL = 5

const isLearning = (s: SkillState | undefined): boolean => s !== undefined && (s.status === 'aprenent' || s.status === 'consolidant')

interface Available {
  skills: SkillNode[]
  /** No skill was open: the game's own (locked) skills are served anyway, as the child chose them. */
  forced: boolean
}

function availableSkills(input: SelectorInput): Available {
  const masteryOf = (id: string): number => input.skillStates[id]?.mastery ?? 0
  const allowed = input.skills.filter((skill) => input.restrictTo === undefined || input.restrictTo.includes(skill.id))
  const open = allowed.filter((skill) => isSkillOpen(skill, input.skills, input.skillStates, (s) => isUnlocked(s, masteryOf)))
  // A game that only knows locked skills must still show something of its own, never an unrelated skill.
  return open.length > 0 ? { skills: open, forced: false } : { skills: allowed, forced: true }
}

const factContext = (input: SelectorInput): FactContext => ({
  skills: input.skills,
  factStates: input.factStates,
  factsForSkill: input.factsForSkill,
  now: input.now,
  rng: input.rng,
  history: input.history ?? [],
})

/**
 * The choices minus the previous fact (no back-to-back repeat) and minus facts already asked twice today
 * (no endless drilling of the same few), unless that leaves nothing.
 */
const withoutLast = (choices: readonly FactChoice[], ctx: FactContext): FactChoice[] => {
  const last = ctx.history[ctx.history.length - 1]?.factKey
  const fresh = choices.filter((c) => c.factKey !== last && askedInSession(ctx, c.factKey) < session.maxAsksPerSession)
  if (fresh.length > 0) return fresh
  const others = choices.filter((c) => c.factKey !== last)
  return others.length > 0 ? others : [...choices]
}

class Picker {
  readonly ctx: FactContext
  readonly mayIntroduceNow: boolean
  private readonly input: SelectorInput
  private readonly forced: boolean

  constructor(input: SelectorInput, forced: boolean) {
    this.input = input
    this.forced = forced
    this.ctx = factContext(input)
    this.mayIntroduceNow = canIntroduce(this.ctx, input.recent)
  }

  /** New facts only for operations that are already open (strict add, sub, mul, div). */
  mayIntroduce(skill: SkillNode): boolean {
    return this.mayIntroduceNow && !isIntroductionBlocked(skill, this.input.skills, this.input.skillStates)
  }

  /** Picks the fact to ask for a skill; undefined when it has nothing it may show right now. */
  fact(skill: SkillNode): string | undefined {
    const { rng } = this.input
    const unseen = unseenFacts(this.ctx, skill)
    const learning = withoutLast(inFlightFacts(this.ctx, [skill]), this.ctx)
    if (this.mayIntroduce(skill) && unseen.length > 0 && (learning.length === 0 || rng.next() < NEW_FACT_CHANCE_WHEN_BUSY)) return rng.pick(unseen)
    if (learning.length > 0) return rng.pick(learning).factKey
    const seen = withoutLast(weakestSeen(this.ctx, [skill]), this.ctx)
    if (seen.length > 0) return rng.pick(seen.slice(0, WEAKEST_POOL)).factKey
    return this.forced && unseen.length > 0 ? rng.pick(unseen) : undefined
  }

  select(skill: SkillNode, mode: SelectionMode): Selection | undefined {
    if (!skill.hasFacts) return { skillId: skill.id, mode }
    const factKey = this.fact(skill)
    if (factKey === undefined) return undefined
    return { skillId: skill.id, factKey, mode: isSeen(this.input.factStates[factKey]) ? mode : 'nou' }
  }
}

/** Fluency warm-up: facts already in the given box or above, slow ones first, operations mixed. */
function warmupPick(input: SelectorInput, skills: readonly SkillNode[], ctx: FactContext, minBox: number): Selection | undefined {
  const pool = skills
    .filter((s) => s.hasFacts)
    .flatMap((s) => input.factsForSkill(s.id).flatMap((k) => ((input.factStates[k]?.box ?? 0) >= minBox && isSeen(input.factStates[k]) ? [{ skillId: s.id, factKey: k, op: s.operation }] : [])))
  if (pool.length === 0) return undefined
  const slow = pool.filter((c) => c.op === undefined || !isAutomatised(input.factStates[c.factKey], strictTargetFor(c.op)))
  const source = slow.length > 0 && input.rng.next() < 0.7 ? slow : pool
  const chosen = interleave(ctx, input.rng.shuffle(source))
  return chosen ? { skillId: chosen.skillId, factKey: chosen.factKey, mode: 'repas' } : undefined
}

/** One question for the operation in progress: its due facts, what is being learned, or a new fact. */
function corePick(input: SelectorInput, picker: Picker, skills: readonly SkillNode[]): Selection | undefined {
  const core = coreOperation(input.skills, input.skillStates)
  const coreSkills = skills.filter((s) => s.hasFacts && s.operation === core)
  if (core === undefined || coreSkills.length === 0) return undefined
  const { ctx } = picker
  const introduce = (): Selection | undefined => {
    const fresh = coreSkills.filter((s) => picker.mayIntroduce(s) && unseenFacts(ctx, s).length > 0)
    const skill = fresh.length > 0 ? input.rng.pick(fresh) : undefined
    return skill ? { skillId: skill.id, factKey: input.rng.pick(unseenFacts(ctx, skill)), mode: 'nou' } : undefined
  }
  if (input.rng.next() < CORE_INTRO_FIRST) {
    const first = introduce()
    if (first) return first
  }
  const due = interleave(ctx, dueFacts(ctx, coreSkills))
  if (due) return { skillId: due.skillId, factKey: due.factKey, mode: 'repas' }
  const learning = withoutLast(inFlightFacts(ctx, coreSkills), ctx)
  if (learning.length > 0 && input.rng.next() >= NEW_FACT_CHANCE_WHEN_BUSY) {
    const chosen = input.rng.pick(learning)
    return { skillId: chosen.skillId, factKey: chosen.factKey, mode: 'consolidacio' }
  }
  const fresh = introduce()
  if (fresh) return fresh
  // Not urgent: only facts that were not drilled enough today already; otherwise let other skills have the turn.
  const weak = withoutLast(weakestSeen(ctx, coreSkills), ctx).filter((c) => askedInSession(ctx, c.factKey) < session.maxAsksPerSession).slice(0, WEAKEST_POOL)
  const chosen = weak.length > 0 ? input.rng.pick(weak) : undefined
  return chosen ? { skillId: chosen.skillId, factKey: chosen.factKey, mode: 'consolidacio' } : undefined
}

function reviewPick(input: SelectorInput, picker: Picker, skills: SkillNode[]): Selection | undefined {
  const due = interleave(picker.ctx, dueFacts(picker.ctx, skills))
  if (due) return { skillId: due.skillId, factKey: due.factKey, mode: 'repas' }

  const mastered = skills.filter((s) => input.skillStates[s.id]?.status === 'dominada')
  // Nothing due: revisit mastered content now and then, never most of the time.
  if (mastered.length === 0 || input.rng.next() >= session.occasionalReview) return undefined
  return picker.select(input.rng.pick(mastered), 'repas')
}

export function selectNext(input: SelectorInput): Selection {
  const { skills, forced } = availableSkills(input)
  const fallback = skills[0] ?? input.skills.find((s) => s.prereqs.length === 0) ?? input.skills[0]
  if (!fallback) throw new Error('No hi ha habilitats')
  const picker = new Picker(input, forced)

  if (input.minBox !== undefined) {
    const warm = warmupPick(input, skills, picker.ctx, input.minBox)
    if (warm) return warm
  }
  if (!forced && input.rng.next() < mission.coreWeight) {
    const core = corePick(input, picker, skills)
    if (core) return core
  }

  const accuracy = accuracyOf(input.recent)
  const newShare = accuracy < session.lowAccuracy ? 0 : accuracy > session.highAccuracy ? 0.2 : 0.1
  const learning = skills.filter((s) => isLearning(input.skillStates[s.id]))
  const fresh = skills.filter((s) => input.skillStates[s.id] === undefined)
  const roll = input.rng.next()

  if (roll < session.reviewShare) {
    const review = reviewPick(input, picker, skills)
    if (review) return review
  }
  const firstFresh = fresh[0]
  if (roll >= 1 - newShare && firstFresh) {
    const pick = picker.select(firstFresh, 'nou')
    if (pick) return pick
  }
  if (learning.length > 0) {
    // When struggling, stay on the easiest learning skill; otherwise vary.
    const skill = accuracy < session.lowAccuracy ? (learning[0] as SkillNode) : input.rng.pick(learning)
    const pick = picker.select(skill, 'consolidacio')
    if (pick) return pick
  }
  if (firstFresh) {
    const pick = picker.select(firstFresh, 'nou')
    if (pick) return pick
  }
  const review = reviewPick(input, picker, skills)
  if (review) return review
  const own = picker.select(fallback, 'consolidacio')
  if (own) return own
  const pulled = soonestDue(picker.ctx, skills)
  return pulled ? { skillId: pulled.skillId, factKey: pulled.factKey, mode: 'repas' } : { skillId: fallback.id, mode: 'consolidacio' }
}

/**
 * Skill to work on: the earliest one still being learned (a core-operation skill first),
 * else the first new unlocked one.
 */
export function focusSkill(skills: readonly SkillNode[], skillStates: Readonly<Record<string, SkillState>>): string {
  const core = coreOperation(skills, skillStates)
  const coreLearning = skills.find((s) => core !== undefined && s.operation === core && isLearning(skillStates[s.id]))
  if (coreLearning) return coreLearning.id
  const learning = skills.find((s) => isLearning(skillStates[s.id]))
  if (learning) return learning.id
  const masteryOf = (id: string): number => skillStates[id]?.mastery ?? 0
  const fresh = skills.find((s) => skillStates[s.id] === undefined && isUnlocked(s, masteryOf) && !isIntroductionBlocked(s, skills, skillStates))
  return (fresh ?? skills[0])?.id ?? ''
}
