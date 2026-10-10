import type { Pt } from './actorMachine'
import type { Rect } from './zones'

/** Stacking order from the floor position (the one every sandbox layer uses). */
export const stackFor = (y: number): number => 10 + Math.round(y * 1000)

/** Pets sit this far behind persons at the same depth. */
export const PET_BEHIND = 120

/** A seat, door or spot on screen, as fractions of the stage, with the z-index it is drawn at. */
export interface HotRect extends Rect {
  readonly z: number
}

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * z-index of a pet at `at` (its box is `w` × `h` stage fractions, feet at `at`). Normally behind persons at the
 * same depth; but never above a hotspot it overlaps: a pet must not cover the edge of a seat or a door.
 */
export function petLayer(at: Pt, w: number, h: number, hot: readonly HotRect[]): number {
  const base = stackFor(at.y) - PET_BEHIND
  const box: Rect = { x: at.x - w / 2, y: at.y - h, w, h }
  return hot.reduce((z, spot) => (overlaps(box, spot) ? Math.min(z, spot.z - 1) : z), base)
}

/** Moves `spot` out of the nearest rectangle that contains it (pets keep away from these). Pure. */
export function avoidRects(spot: Pt, rects: readonly Rect[], margin = 0.02): Pt {
  return rects.reduce((p, r) => {
    if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return p
    const options: Pt[] = [
      { x: r.x - margin, y: p.y },
      { x: r.x + r.w + margin, y: p.y },
      { x: p.x, y: r.y - margin },
      { x: p.x, y: r.y + r.h + margin },
    ]
    const dist = (q: Pt): number => Math.hypot(q.x - p.x, q.y - p.y)
    const inside = (q: Pt): boolean => q.x >= 0.03 && q.x <= 0.97 && q.y >= 0.03 && q.y <= 0.97
    const ok = options.filter(inside)
    return (ok.length > 0 ? ok : options).reduce((best, q) => (dist(q) < dist(best) ? q : best))
  }, spot)
}

export const insideAny = (rects: readonly Rect[], p: Pt): boolean => rects.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
