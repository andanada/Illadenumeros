import type { AnswerSpeed } from './pace'

/** Immutable tally of one speed round. Nothing here is ever shown as a grade. */
export interface RoundStats {
  /** Questions finished (right answer, or solution shown). */
  finished: number
  /** Solved correctly without any help. */
  clean: number
  /** Clean answers within the personal pace. */
  fast: number
  fastStreak: number
  bestStreak: number
  /** Response times of clean, correct answers (for the personal-best comparison). */
  cleanRts: readonly number[]
  /** Times a target swam away without being chosen (not wrong, just not fluent yet). */
  leftBehind: number
  /** Consecutive questions that swam away. */
  missesInRow: number
}

export const emptyStats: RoundStats = { finished: 0, clean: 0, fast: 0, fastStreak: 0, bestStreak: 0, cleanRts: [], leftBehind: 0, missesInRow: 0 }

export interface FinishedQuestion {
  correct: boolean
  /** True when solved at the first try with no help. */
  clean: boolean
  speed: AnswerSpeed
  rtMs: number
}

export function addFinished(stats: RoundStats, q: FinishedQuestion): RoundStats {
  const isClean = q.correct && q.clean
  const isFast = isClean && q.speed === 'fast'
  const fastStreak = isFast ? stats.fastStreak + 1 : 0
  return {
    ...stats,
    finished: stats.finished + 1,
    clean: stats.clean + (isClean ? 1 : 0),
    fast: stats.fast + (isFast ? 1 : 0),
    fastStreak,
    bestStreak: Math.max(stats.bestStreak, fastStreak),
    cleanRts: isClean ? [...stats.cleanRts, q.rtMs] : stats.cleanRts,
    missesInRow: 0,
  }
}

/** A target left the screen: it comes back later, nothing is lost. */
export function addLeftBehind(stats: RoundStats): RoundStats {
  return { ...stats, leftBehind: stats.leftBehind + 1, missesInRow: stats.missesInRow + 1, fastStreak: 0 }
}
