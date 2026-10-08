import { MASTERY_THRESHOLDS } from '../../../core/engine/thresholds'

const LENIENCY = MASTERY_THRESHOLDS.leitner.fluencyLeniency
/** A fact without history starts at this multiple of the skill's fluency target (generous). */
const START_FACTOR = 2.5
const FOLLOW_MEDIAN = 0.9

/** Bounds of the time a fish needs to cross the pond: a 1st-grader is never overwhelmed. */
export const DRIFT_MIN_MS = 9000
export const DRIFT_MAX_MS = 20_000
const DRIFT_PACE_FACTOR = 2
const MISS_EXTRA = 0.15
const MAX_MISS_STEPS = 4
const CALM_AFTER_MISSES = 3

/**
 * Personal target pace for one fact: 90 % of the child's recent median, never below the fluent goal
 * (target x leniency) and never above the generous start.
 */
export function paceMs(medianRtMs: number | undefined, fluencyTargetMs: number): number {
  const goal = fluencyTargetMs * LENIENCY
  const start = fluencyTargetMs * START_FACTOR
  if (medianRtMs === undefined) return start
  return Math.min(start, Math.max(goal, medianRtMs * FOLLOW_MEDIAN))
}

export type AnswerSpeed = 'fast' | 'steady' | 'calm'

/** Within the pace is fast; within twice the pace steady; anything slower is just calm (never a failure). */
export function classifyAnswer(rtMs: number, pace: number): AnswerSpeed {
  if (rtMs <= pace) return 'fast'
  return rtMs <= pace * 2 ? 'steady' : 'calm'
}

/** Seconds a fish needs to cross the pond: twice the pace, +15 % per recent miss, always within bounds. */
export function driftDurationMs(pace: number, recentMisses: number): number {
  const misses = Math.min(Math.max(0, recentMisses), MAX_MISS_STEPS)
  const raw = pace * DRIFT_PACE_FACTOR * (1 + MISS_EXTRA * misses)
  return Math.round(Math.min(DRIFT_MAX_MS, Math.max(DRIFT_MIN_MS, raw)))
}

/** After several misses in a row the fish wait for the child instead of swimming away. */
export const shouldCalmDown = (consecutiveMisses: number): boolean => consecutiveMisses >= CALM_AFTER_MISSES
