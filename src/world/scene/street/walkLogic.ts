/**
 * Pure maths of walking along the street. Units: street units (1 ≈ 1 px at scale 1), ms and seconds.
 */

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Walking speed in street units per second (a relaxed stroll: a lot of street in about ten seconds). */
export const WALK_SPEED = 360

/** One frame of walking toward `target`: never overshoots, `arrived` once there. */
export function stepToward(x: number, target: number, dtMs: number, speed = WALK_SPEED): { x: number; arrived: boolean } {
  const reach = (speed * dtMs) / 1000
  const gap = target - x
  if (Math.abs(gap) <= reach) return { x: target, arrived: true }
  return { x: x + Math.sign(gap) * reach, arrived: false }
}

/** Camera easing: moves a fraction of the way to `target` that depends on the frame time, not the frame rate. */
export function followOffset(current: number, target: number, dtMs: number, rate = 5): number {
  const k = 1 - Math.exp((-rate * dtMs) / 1000)
  return current + (target - current) * k
}

/** Camera offset (≤ 0) that puts street position `x` in the middle of the viewport, within the street. */
export const cameraFor = (x: number, scale: number, viewport: number, min: number): number => clamp(viewport / 2 - x * scale, min, 0)

/** Street position under a screen x, given the camera offset. */
export const streetXAt = (clientX: number, left: number, offset: number, scale: number): number => (clientX - left - offset) / scale

/** Where she may walk: a margin inside both ends of the street. */
export const walkBounds = (length: number, margin = 60): { min: number; max: number } => ({ min: margin, max: Math.max(margin, length - margin) })

/** True when she already stands at a door (close enough that tapping it just opens it). */
export const atDoor = (x: number, doorCentre: number, doorWidth: number): boolean => Math.abs(x - doorCentre) <= Math.max(40, doorWidth * 0.2)
