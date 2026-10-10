/**
 * Lightweight toss physics: a flicked object flies in an arc, bounces on the floor line with energy loss,
 * and stops. Units: scene fractions (0..1) and seconds. Pure; no library.
 */
import { clamp } from '../../scene/logic/inertia'

export interface Ball {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly bounces: number
  readonly resting: boolean
}

export const GRAVITY = 2.4
export const RESTITUTION = 0.52
export const MAX_FLICK = 1.6
const MAX_BOUNCES = 4

/** A flick (pointer velocity in fraction/s) becomes a launch, capped so a wild swipe stays in the room. */
export function launch(from: { x: number; y: number }, flick: { vx: number; vy: number }): Ball {
  return {
    x: from.x,
    y: from.y,
    vx: clamp(flick.vx, -MAX_FLICK, MAX_FLICK),
    vy: clamp(Math.min(flick.vy, -0.35), -MAX_FLICK, 0),
    bounces: 0,
    resting: false,
  }
}

export interface TossBounds {
  /** y of the floor the ball lands on. */
  readonly floor: number
  readonly minX: number
  readonly maxX: number
}

export function tossStep(b: Ball, dt: number, bounds: TossBounds): Ball {
  if (b.resting) return b
  let vx = b.vx
  let vy = b.vy + GRAVITY * dt
  let x = b.x + vx * dt
  let y = b.y + vy * dt
  let bounces = b.bounces
  if (x < bounds.minX || x > bounds.maxX) {
    x = clamp(x, bounds.minX, bounds.maxX)
    vx = -vx * RESTITUTION
  }
  if (y >= bounds.floor) {
    y = bounds.floor
    if (Math.abs(vy) < 0.25 || bounces >= MAX_BOUNCES) return { x, y, vx: 0, vy: 0, bounces, resting: true }
    vy = -vy * RESTITUTION
    vx *= 0.8
    bounces += 1
  }
  return { x, y, vx, vy, bounces, resting: false }
}

/** Runs the whole toss (for tests and for the reduced-motion shortcut: just use the final spot). */
export function simulateToss(start: Ball, bounds: TossBounds, dt = 1 / 60, maxSteps = 600): { final: Ball; steps: number } {
  let b = start
  let steps = 0
  while (!b.resting && steps < maxSteps) {
    b = tossStep(b, dt, bounds)
    steps += 1
  }
  return { final: b, steps }
}
