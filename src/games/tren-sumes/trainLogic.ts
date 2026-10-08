import type { AnswerSpeed } from '../shared/speed/pace'

/** Distance (in steps) from the start to the station. A fast answer is one full step. */
export const TRIP_STEPS = 12
/** A trip never ends before this many questions, so every session has enough practice. */
export const MIN_ROUNDS = 8
/** Fast answers in a row that fill the steam gauge. */
export const STEAM_FULL_AT = 4

/** How far one finished question moves the train. Slow answers only slow the train: it always moves. */
export function stepFor(speed: AnswerSpeed, clean: boolean): number {
  if (!clean) return 0.4
  return speed === 'fast' ? 1 : speed === 'steady' ? 0.8 : 0.6
}

export const tripProgress = (distance: number): number => Math.min(1, Math.max(0, distance / TRIP_STEPS))

/** Steam gauge 0..1 from the current streak of fast answers. */
export const steamLevel = (fastStreak: number): number => Math.min(1, Math.max(0, fastStreak / STEAM_FULL_AT))

/** Questions allowed in the trip: the host limit can shorten it but never below the minimum. */
export const roundCap = (maxRounds: number | undefined): number | undefined =>
  maxRounds === undefined ? undefined : Math.max(MIN_ROUNDS, maxRounds)

/** The train reaches the station (the trip ends) at the station distance, or at the host cap. */
export function tripEnded(distance: number, finished: number, maxRounds: number | undefined): boolean {
  if (finished < MIN_ROUNDS) return false
  const cap = roundCap(maxRounds)
  return distance >= TRIP_STEPS || (cap !== undefined && finished >= cap)
}
