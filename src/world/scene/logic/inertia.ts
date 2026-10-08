/**
 * Inertia for the panoramic street: velocity from the last pointer samples, then a friction glide that
 * stops at the edges. Units: px and ms. Pure, so the feel is tested without a browser.
 */

export interface Sample {
  x: number
  t: number
}

/** Fraction of the velocity kept per millisecond (0.995 ≈ a short, soft glide). */
export const FRICTION_PER_MS = 0.995
/** Below this speed (px/ms) the glide stops. */
export const MIN_SPEED = 0.02
/** Fastest fling we honour, so a wild swipe does not cross the whole town. */
export const MAX_SPEED = 4
/** Only samples from the last moments of the gesture count. */
export const SAMPLE_WINDOW_MS = 100

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/** Keeps the last samples inside the window (new array). */
export function pushSample(samples: readonly Sample[], sample: Sample, windowMs = SAMPLE_WINDOW_MS): Sample[] {
  return [...samples, sample].filter((s) => sample.t - s.t <= windowMs)
}

/** Release velocity in px/ms from the samples (0 when the finger stopped before lifting). */
export function releaseVelocity(samples: readonly Sample[]): number {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last || last.t <= first.t) return 0
  return clamp((last.x - first.x) / (last.t - first.t), -MAX_SPEED, MAX_SPEED)
}

/** Total distance a fling travels before friction stops it (geometric series of the per-ms decay). */
export function glideDistance(velocity: number, friction = FRICTION_PER_MS): number {
  if (Math.abs(velocity) < MIN_SPEED) return 0
  return velocity / (1 - friction)
}

/** Where the street comes to rest after a fling from `offset`, inside [min, max]. */
export function restingOffset(offset: number, velocity: number, min: number, max: number, friction = FRICTION_PER_MS): number {
  return clamp(offset + glideDistance(velocity, friction), min, max)
}

/** One frame of the glide: new offset and velocity; velocity is 0 once stopped or at an edge. */
export function glideStep(offset: number, velocity: number, dtMs: number, min: number, max: number, friction = FRICTION_PER_MS): { offset: number; velocity: number } {
  const decayed = velocity * Math.pow(friction, dtMs)
  const next = offset + decayed * dtMs
  if (next <= min || next >= max) return { offset: clamp(next, min, max), velocity: 0 }
  return { offset: next, velocity: Math.abs(decayed) < MIN_SPEED ? 0 : decayed }
}

/** Dragging past an edge only follows the finger a little (rubber band), never further than `limit`. */
export function rubberBand(offset: number, min: number, max: number, limit = 80): number {
  if (offset > max) return max + limit * (1 - 1 / ((offset - max) / limit + 1))
  if (offset < min) return min - limit * (1 - 1 / ((min - offset) / limit + 1))
  return offset
}

/** Street offset that brings a building (centre `x`, in street px) to the middle of the viewport. */
export const offsetToCentre = (x: number, viewport: number, min: number, max: number): number => clamp(viewport / 2 - x, min, max)
