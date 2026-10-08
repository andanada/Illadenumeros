import { CPA_STAGES, type CpaStage } from '../ambit/types'
import { MASTERY_THRESHOLDS } from './thresholds'

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

const MIN_ANSWERS_TO_SOFTEN = 5

/**
 * Automatic softening: when accuracy over the last 10 answers is below 70 % the next questions are shown
 * one stage more visual (abstract -> pictorial -> concrete). The stored stage of the skill is untouched.
 */
export function softenedStage(stage: CpaStage, recent: readonly boolean[]): CpaStage {
  const { softenBelow, softenWindow } = MASTERY_THRESHOLDS.mission
  const window = recent.slice(-softenWindow)
  if (window.length < MIN_ANSWERS_TO_SOFTEN || window.filter(Boolean).length / window.length >= softenBelow) return stage
  return CPA_STAGES[Math.max(0, CPA_STAGES.indexOf(stage) - 1)] ?? stage
}
