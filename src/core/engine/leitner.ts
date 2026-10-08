import { z } from 'zod'

import { BOX_INTERVAL_DAYS, MASTERY_THRESHOLDS } from './thresholds'

export { BOX_INTERVAL_DAYS }

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1
const RECENT_RT_WINDOW = MASTERY_THRESHOLDS.leitner.recentRtWindow
/** After an error the fact comes back within the same session. */
const RETRY_SOON_MS = MASTERY_THRESHOLDS.leitner.retrySoonMs

export const factStateSchema = z.object({
  factKey: z.string(),
  box: z.number().int().min(0).max(MAX_BOX),
  streak: z.number().int().min(0),
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  recentRts: z.array(z.number().nonnegative()),
  lastSeen: z.number(),
  dueAt: z.number(),
})
export type FactState = z.infer<typeof factStateSchema>

export interface FactAnswer {
  correct: boolean
  rtMs: number
  targetMs: number
  now: number
}

export function newFactState(factKey: string, now: number): FactState {
  return { factKey, box: 0, streak: 0, attempts: 0, correct: 0, recentRts: [], lastSeen: 0, dueAt: now }
}

/** True while the fact only waits for its same-session retry (after an error or a slow box-0 answer). */
export const isRetryPending = (state: FactState): boolean => state.attempts > 0 && state.dueAt - state.lastSeen === RETRY_SOON_MS

const dueIn = (box: number, now: number): number => {
  const interval = BOX_INTERVAL_DAYS[box] ?? 0
  return interval === 0 ? now + RETRY_SOON_MS : now + interval * DAY_MS
}

/**
 * A box is earned only by SPACED successes: a fast correct answer promotes the fact when its review is due
 * (or when it is still in box 0). Repeating it early the same day, or answering right after an error,
 * never jumps boxes. An early success leaves the schedule untouched.
 */
export function updateFact(state: FactState, answer: FactAnswer): FactState {
  const base = { ...state, attempts: state.attempts + 1, lastSeen: answer.now }

  if (!answer.correct) {
    return { ...base, box: Math.min(1, state.box), streak: 0, dueAt: answer.now + RETRY_SOON_MS }
  }

  const common = {
    ...base,
    streak: state.streak + 1,
    correct: state.correct + 1,
    recentRts: [...state.recentRts, answer.rtMs].slice(-RECENT_RT_WINDOW),
  }
  const retryPending = isRetryPending(state)
  const eligible = state.box === 0 || (!retryPending && answer.now >= state.dueAt)
  if (!eligible) {
    // Right after an error the fact is re-anchored one interval ahead; an early repeat keeps its date.
    return { ...common, box: state.box, dueAt: retryPending ? dueIn(Math.max(1, state.box), answer.now) : state.dueAt }
  }
  const fast = answer.rtMs <= answer.targetMs
  const box = fast ? Math.min(MAX_BOX, state.box + 1) : state.box
  return { ...common, box, dueAt: dueIn(box, answer.now) }
}

export function medianRt(state: FactState): number | undefined {
  if (state.recentRts.length === 0) return undefined
  const sorted = [...state.recentRts].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

export function isFluent(state: FactState, targetMs: number): boolean {
  const median = medianRt(state)
  return state.box >= 3 && median !== undefined && median <= targetMs
}

export function isDue(state: FactState, now: number): boolean {
  return state.dueAt <= now
}
