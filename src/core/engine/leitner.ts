import { z } from 'zod'

const DAY_MS = 24 * 60 * 60 * 1000
/** Box 0 = same session; then 1, 2, 4, 9, 21 days. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 9, 21] as const
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1
const RECENT_RT_WINDOW = 5
/** After an error the fact comes back within the same session. */
const RETRY_SOON_MS = 30_000

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

export function updateFact(state: FactState, answer: FactAnswer): FactState {
  const base = { ...state, attempts: state.attempts + 1, lastSeen: answer.now }

  if (!answer.correct) {
    return { ...base, box: Math.min(1, state.box), streak: 0, dueAt: answer.now + RETRY_SOON_MS }
  }

  const fast = answer.rtMs <= answer.targetMs
  const box = fast ? Math.min(MAX_BOX, state.box + 1) : state.box
  const interval = BOX_INTERVAL_DAYS[box] ?? 0
  return {
    ...base,
    box,
    streak: state.streak + 1,
    correct: state.correct + 1,
    recentRts: [...state.recentRts, answer.rtMs].slice(-RECENT_RT_WINDOW),
    dueAt: interval === 0 ? answer.now + RETRY_SOON_MS : answer.now + interval * DAY_MS,
  }
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
