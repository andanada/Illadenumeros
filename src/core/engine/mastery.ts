import { z } from 'zod'
import { cpaStageSchema } from '../ambit/types'
import { nextCpaStage } from './cpa'

const ALPHA = 0.3
const ACCURACY_WEIGHT = 0.6
const MASTERED_AT = 0.85
const CONSOLIDATING_AT = 0.6
const MIN_ATTEMPTS_TO_MASTER = 20
const MIN_SESSIONS_TO_MASTER = 2
/** A mastered skill keeps its status until mastery drops below this. */
const KEEP_MASTERED_ABOVE = 0.65
const RECENT_WINDOW = 10
const MAX_SESSIONS_TRACKED = 10

export const SKILL_STATUSES = ['bloquejada', 'nova', 'aprenent', 'consolidant', 'dominada'] as const
export type SkillStatus = (typeof SKILL_STATUSES)[number]

export const skillStateSchema = z.object({
  skillId: z.string(),
  accuracy: z.number().min(0).max(1),
  fluency: z.number().min(0).max(1),
  mastery: z.number().min(0).max(1),
  status: z.enum(SKILL_STATUSES),
  cpaStage: cpaStageSchema,
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  sessions: z.array(z.string()),
  recent: z.array(z.boolean()),
  consecutiveErrors: z.number().int().min(0),
  /** Last local change (ms). Optional: rows written before cloud sync have none (backfilled on first sync). */
  updatedAt: z.number().int().min(0).optional(),
})
export type SkillState = z.infer<typeof skillStateSchema>

export interface SkillAnswer {
  correct: boolean
  /** Share of this skill's practiced facts that are fluent (0..1). */
  fluentRatio: number
  sessionId: string
  hasFacts: boolean
  /** Time of the answer; stamped as `updatedAt` (drives last-write-wins when syncing devices). */
  now?: number
}

export function newSkillState(skillId: string): SkillState {
  return {
    skillId,
    accuracy: 0,
    fluency: 0,
    mastery: 0,
    status: 'nova',
    cpaStage: 'concret',
    attempts: 0,
    correct: 0,
    sessions: [],
    recent: [],
    consecutiveErrors: 0,
  }
}

export function statusFor(input: { mastery: number; attempts: number; sessions: number }): SkillStatus {
  if (input.mastery >= MASTERED_AT && input.attempts >= MIN_ATTEMPTS_TO_MASTER && input.sessions >= MIN_SESSIONS_TO_MASTER) {
    return 'dominada'
  }
  return input.mastery >= CONSOLIDATING_AT ? 'consolidant' : 'aprenent'
}

export function updateSkill(state: SkillState, answer: SkillAnswer): SkillState {
  const value = answer.correct ? 1 : 0
  // A fresh state starts from the answer itself; a placed one (accuracy > 0) keeps its level.
  const fresh = state.attempts === 0 && state.accuracy === 0
  const accuracy = fresh ? value * ALPHA : ALPHA * value + (1 - ALPHA) * state.accuracy
  const fluency = answer.hasFacts ? answer.fluentRatio : 0
  const mastery = answer.hasFacts ? ACCURACY_WEIGHT * accuracy + (1 - ACCURACY_WEIGHT) * fluency : accuracy

  const sessions = state.sessions.includes(answer.sessionId)
    ? state.sessions
    : [...state.sessions, answer.sessionId].slice(-MAX_SESSIONS_TRACKED)
  const window = [...state.recent, answer.correct].slice(-RECENT_WINDOW)
  const consecutiveErrors = answer.correct ? 0 : state.consecutiveErrors + 1
  const attempts = state.attempts + 1
  const cpaStage = nextCpaStage(state.cpaStage, window, consecutiveErrors)
  // A new CPA stage starts a fresh window, so stages are never skipped.
  const recent = cpaStage === state.cpaStage ? window : []

  return {
    ...state,
    accuracy,
    fluency,
    mastery,
    attempts,
    correct: state.correct + value,
    sessions,
    recent,
    consecutiveErrors,
    cpaStage,
    ...(answer.now !== undefined ? { updatedAt: answer.now } : {}),
    status:
      state.status === 'dominada' && mastery >= KEEP_MASTERED_ABOVE
        ? 'dominada'
        : statusFor({ mastery, attempts, sessions: sessions.length }),
  }
}
