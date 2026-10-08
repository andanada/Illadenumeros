import { medianRt, type FactState } from './leitner'
import { MASTERY_THRESHOLDS } from './thresholds'

const DAY_MS = 86_400_000

/** Local calendar day, same format as the rest of the app (YYYY-MM-DD). */
export const dayKey = (ms: number): string => new Date(ms).toLocaleDateString('sv-SE')

/** Box >= 4 (reached by spaced successes) and a median response time within the STRICT target. */
export function isAutomatised(state: FactState | undefined, strictTargetMs: number): boolean {
  if (!state || state.box < MASTERY_THRESHOLDS.core.factMinBox) return false
  const median = medianRt(state)
  return median !== undefined && median <= strictTargetMs
}

export interface FactRetention {
  total: number
  automatised: number
  /** Practised but not automatised yet. */
  inReview: number
  unseen: number
  /** automatised / total (0 for an empty list). */
  share: number
}

export function factRetention(keys: readonly string[], states: Readonly<Record<string, FactState | undefined>>, strictTargetMs: number): FactRetention {
  let automatised = 0
  let inReview = 0
  let unseen = 0
  for (const key of keys) {
    const state = states[key]
    if (!state || state.attempts <= 0) unseen += 1
    else if (isAutomatised(state, strictTargetMs)) automatised += 1
    else inReview += 1
  }
  const total = keys.length
  return { total, automatised, inReview, unseen, share: total === 0 ? 0 : automatised / total }
}

/** Adds the local day of `now` (once) and forgets days outside the window. Immutable. */
export function addCleanDay(days: readonly string[], now: number): string[] {
  const oldest = dayKey(now - MASTERY_THRESHOLDS.core.cleanDaysWindow * DAY_MS)
  const today = dayKey(now)
  return [...new Set([...days, today])].filter((d) => d >= oldest).sort()
}

interface CleanAttempt {
  skillId: string
  correct: boolean
  hintsUsed: number
  createdAt: number
}

/** Distinct days with a correct answer without help, per skill, rebuilt from stored attempts. */
export function cleanDaysFromAttempts(attempts: readonly CleanAttempt[], now: number): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const a of attempts) {
    if (!a.correct || a.hintsUsed > 0) continue
    result[a.skillId] = addCleanDay(result[a.skillId] ?? [], a.createdAt)
  }
  const oldest = dayKey(now - MASTERY_THRESHOLDS.core.cleanDaysWindow * DAY_MS)
  return Object.fromEntries(Object.entries(result).map(([id, days]) => [id, days.filter((d) => d >= oldest)]).filter(([, days]) => (days as string[]).length > 0))
}

export interface RetentionGate {
  /** Share of the skill's facts that are automatised. */
  share: number
  /** Distinct days with a clean correct answer. */
  cleanDays: number
}

export function retentionPasses(gate: RetentionGate, level: 'gain' | 'keep'): boolean {
  const { core } = MASTERY_THRESHOLDS
  return gate.share >= (level === 'gain' ? core.gainShare : core.keepShare) && gate.cleanDays >= core.minCleanDays
}
