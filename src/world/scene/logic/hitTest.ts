import type { Point } from './dragMachine'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface ZoneShape {
  id: string
  rect: Rect
  /** Higher wins when zones overlap (e.g. the basket on top of the counter). */
  z?: number
}

/** Extra px around every zone so a small finger landing on the edge still counts. */
export const ZONE_SLOP_PX = 16

export const contains = (rect: Rect, point: Point, slop = 0): boolean =>
  point.x >= rect.left - slop && point.x <= rect.left + rect.width + slop && point.y >= rect.top - slop && point.y <= rect.top + rect.height + slop

const centre = (rect: Rect): Point => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })

/**
 * Zone under the point among those that accept the prop. Overlaps: the highest `z`, then the zone whose
 * centre is nearest (so dropping between two shelves picks the closer one). Undefined = nothing accepts it there.
 */
export function zoneAt<Z extends ZoneShape>(zones: readonly Z[], point: Point, accepts: (zone: Z) => boolean = () => true, slop = ZONE_SLOP_PX): Z | undefined {
  const hits = zones.filter((zone) => contains(zone.rect, point, slop) && accepts(zone))
  if (hits.length === 0) return undefined
  return [...hits].sort((a, b) => (b.z ?? 0) - (a.z ?? 0) || dist(centre(a.rect), point) - dist(centre(b.rect), point))[0]
}

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Index of the next zone for arrow keys / Tab while a prop is held (wraps around). */
export function cycleIndex(current: number, count: number, step: 1 | -1): number {
  if (count <= 0) return -1
  if (current < 0) return step === 1 ? 0 : count - 1
  return (((current + step) % count) + count) % count
}
