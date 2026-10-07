import { CPA_STAGES, type CpaStage } from '../ambit/types'

const WINDOW = 10
const PROMOTE_AT = 8
const DEMOTE_AFTER_ERRORS = 2

/**
 * Concrete → pictorial → abstract. Promote with 8/10 correct,
 * demote after 2 consecutive errors (never below concrete).
 */
export function nextCpaStage(current: CpaStage, recent: readonly boolean[], consecutiveErrors: number): CpaStage {
  const index = CPA_STAGES.indexOf(current)

  // Demote once per error streak (exactly at the threshold), not on every extra error.
  if (consecutiveErrors === DEMOTE_AFTER_ERRORS) {
    return CPA_STAGES[Math.max(0, index - 1)] ?? current
  }

  const window = recent.slice(-WINDOW)
  const correct = window.filter(Boolean).length
  if (window.length >= WINDOW && correct >= PROMOTE_AT) {
    return CPA_STAGES[Math.min(CPA_STAGES.length - 1, index + 1)] ?? current
  }
  return current
}
