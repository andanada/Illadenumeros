/** Fish caught (questions finished) in one session. A session never has fewer than MIN_CATCHES. */
export const CATCH_GOAL = 12
export const MIN_CATCHES = 8
const MAX_STAGGER_MS = 1800
/** Fish are visible roughly this share of their swim, so the leave time is a bit shorter than the swim. */
const VISIBLE_SHARE = 0.9

export interface FishSlot {
  /** Vertical lane (0 = top). */
  lane: number
  /** Start delay in ms so the fish do not swim in a wall. */
  delayMs: number
}

/**
 * Lane and start delay of each fish. Every fish gets its own lane (no overlap) and a growing
 * delay; `serial` rotates the lanes so the right answer is not always in the same lane.
 */
export function layoutFish(count: number, serial: number, lanes = count): FishSlot[] {
  const total = Math.max(1, lanes)
  const step = count > 1 ? Math.min(900, MAX_STAGGER_MS / (count - 1)) : 0
  return Array.from({ length: count }, (_, i) => ({ lane: (i + serial) % total, delayMs: Math.round(i * step) }))
}

/** Time after which the fish of a question have all swum away. */
export function leaveAfterMs(driftMs: number, slots: readonly FishSlot[]): number {
  const stagger = slots.reduce((max, s) => Math.max(max, s.delayMs), 0)
  return Math.round(driftMs * VISIBLE_SHARE + stagger)
}

export const roundCap = (maxRounds: number | undefined): number => Math.max(MIN_CATCHES, maxRounds ?? CATCH_GOAL)

export const catchEnded = (finished: number, maxRounds: number | undefined): boolean => finished >= roundCap(maxRounds)

export const catchProgress = (finished: number, maxRounds: number | undefined): number => Math.min(1, finished / roundCap(maxRounds))
