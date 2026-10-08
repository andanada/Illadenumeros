import type { SkillNode } from '../ambit/types'
import type { Rng } from '../rng'
import { isDue, type FactState } from './leitner'
import { MASTERY_THRESHOLDS } from './thresholds'

const { session } = MASTERY_THRESHOLDS
/** Facts above this box are not drilled again before their review is due. */
const WEAK_MAX_BOX = 1

export interface FactContext {
  skills: readonly SkillNode[]
  factStates: Readonly<Record<string, FactState>>
  factsForSkill: (skillId: string) => string[]
  now: number
  rng: Rng
  /** Recent selections of this session, most recent last. */
  history: readonly { skillId: string; factKey?: string }[]
}

export const accuracyOf = (recent: readonly boolean[]): number => {
  const window = recent.slice(-session.accuracyWindow)
  return window.length < 4 ? 0.8 : window.filter(Boolean).length / window.length
}

/** A fact still being learned: seen, but not yet answered right twice in a row after its first success. */
export const isInFlight = (fact: FactState | undefined): boolean =>
  fact !== undefined && fact.attempts > 0 && (fact.box === 0 || fact.streak < MASTERY_THRESHOLDS.leitner.inFlightStreak)

export const isSeen = (fact: FactState | undefined): boolean => fact !== undefined && fact.attempts > 0

/** Facts being learned across ALL fact skills (the limit of 3 new facts at once is for the child, not per skill). */
export function inFlightCount(ctx: Pick<FactContext, 'skills' | 'factStates' | 'factsForSkill'>): number {
  return ctx.skills.filter((s) => s.hasFacts).reduce((n, s) => n + ctx.factsForSkill(s.id).filter((k) => isInFlight(ctx.factStates[k])).length, 0)
}

const opOfSkill = (ctx: FactContext, skillId: string): string | undefined => ctx.skills.find((s) => s.id === skillId)?.operation

/** Prefers a fact that is not the previous one and of another operation (interleaving); never back-to-back if avoidable. */
export function interleave<T extends { skillId: string; factKey: string }>(ctx: FactContext, ordered: readonly T[]): T | undefined {
  const last = ctx.history[ctx.history.length - 1]
  if (!last) return ordered[0]
  const lastOp = opOfSkill(ctx, last.skillId)
  const differentFact = ordered.filter((c) => c.factKey !== last.factKey)
  return differentFact.find((c) => lastOp === undefined || opOfSkill(ctx, c.skillId) !== lastOp) ?? differentFact[0] ?? ordered[0]
}

export const askedInSession = (ctx: Pick<FactContext, 'history'>, key: string): number => ctx.history.filter((h) => h.factKey === key).length

export interface FactChoice {
  skillId: string
  factKey: string
}

/** Facts of the given skills that are due for review, oldest first. */
export function dueFacts(ctx: FactContext, skills: readonly SkillNode[]): (FactChoice & { dueAt: number })[] {
  return skills
    .filter((s) => s.hasFacts)
    .flatMap((s) =>
      ctx.factsForSkill(s.id).flatMap((key) => {
        const fact = ctx.factStates[key]
        return fact && fact.attempts > 0 && isDue(fact, ctx.now) ? [{ skillId: s.id, factKey: key, dueAt: fact.dueAt }] : []
      }),
    )
    .sort((x, y) => x.dueAt - y.dueAt)
}

/** Seen facts of the skills that are being learned. */
export function inFlightFacts(ctx: FactContext, skills: readonly SkillNode[]): FactChoice[] {
  return skills.filter((s) => s.hasFacts).flatMap((s) => ctx.factsForSkill(s.id).filter((k) => isInFlight(ctx.factStates[k])).map((k) => ({ skillId: s.id, factKey: k })))
}

export function unseenFacts(ctx: FactContext, skill: SkillNode): string[] {
  return ctx.factsForSkill(skill.id).filter((k) => !isSeen(ctx.factStates[k]))
}

/** May a NEW fact enter now? Fewer than 3 in flight, and the child is doing fine. */
export const canIntroduce = (ctx: FactContext, recent: readonly boolean[]): boolean =>
  inFlightCount(ctx) < session.maxFactsInFlight && accuracyOf(recent) >= session.lowAccuracy

/** Seen facts that still need work (box 0 or 1, e.g. just after an error), lowest box first. Mature facts are left to their schedule. */
export function weakestSeen(ctx: FactContext, skills: readonly SkillNode[]): FactChoice[] {
  return skills
    .filter((s) => s.hasFacts)
    .flatMap((s) => ctx.factsForSkill(s.id).flatMap((k) => (isSeen(ctx.factStates[k]) && (ctx.factStates[k]?.box ?? 0) <= WEAK_MAX_BOX ? [{ skillId: s.id, factKey: k, box: ctx.factStates[k]?.box ?? 0 }] : [])))
    .sort((a, b) => a.box - b.box)
}

/** Last resort when nothing is due: pull forward the seen fact whose review is closest. */
export function soonestDue(ctx: FactContext, skills: readonly SkillNode[]): FactChoice | undefined {
  const seen = skills
    .filter((s) => s.hasFacts)
    .flatMap((s) => ctx.factsForSkill(s.id).flatMap((k) => (isSeen(ctx.factStates[k]) ? [{ skillId: s.id, factKey: k, dueAt: ctx.factStates[k]?.dueAt ?? 0 }] : [])))
    .sort((a, b) => a.dueAt - b.dueAt)
  return interleave(ctx, seen)
}
