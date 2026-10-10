import type { Pt } from './actorMachine'
import type { ItemState, Items } from './itemsState'

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** The shape of a counting zone that the pure logic needs (the React side adds `accepts`, callbacks…). */
export interface ZoneShape {
  readonly id: string
  readonly room: string
  /** Fractions of the stage; the slots are laid out inside it. */
  readonly rect: Rect
  /** Slots before the zone is full (default 10: a ten-frame). */
  readonly capacity?: number
  /** Slots per row (default 5: ten-frame rows; use `capacity` for a single row). */
  readonly cols?: number
}

export const DEFAULT_CAPACITY = 10
export const DEFAULT_COLS = 5
const SAME = 0.004

export const zoneCapacity = (z: ZoneShape): number => Math.max(1, Math.floor(z.capacity ?? DEFAULT_CAPACITY))

/** Neat slots, row by row, centred in their cells: the same layout a ten-frame or an array uses. */
export function slotPoints(zone: ZoneShape): readonly Pt[] {
  const cap = zoneCapacity(zone)
  const cols = Math.max(1, Math.min(cap, Math.floor(zone.cols ?? DEFAULT_COLS)))
  const rows = Math.ceil(cap / cols)
  const cw = zone.rect.w / cols
  const ch = zone.rect.h / rows
  return Array.from({ length: cap }, (_, i) => ({
    x: zone.rect.x + cw * ((i % cols) + 0.5),
    // Feet of the object: the lower part of its cell.
    y: zone.rect.y + ch * (Math.floor(i / cols) + 0.85),
  }))
}

export const qtyOf = (i: ItemState): number => i.qty ?? 1

export const zoneItems = (items: Items, zoneId: string): ItemState[] => Object.values(items).filter((i) => i.zone === zoneId && i.loc.t === 'floor')

/** How many of each def lie in the zone (stacks count their quantity). */
export function zoneCounts(items: Items, zoneId: string): Readonly<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const i of zoneItems(items, zoneId)) out[i.def] = (out[i.def] ?? 0) + qtyOf(i)
  return out
}

export const zoneTotal = (items: Items, zoneId: string): number => Object.values(zoneCounts(items, zoneId)).reduce((a, b) => a + b, 0)

export interface CountQuery {
  readonly zone?: string
  readonly room?: string
  readonly def?: string
}

/** Objects on the floor that match (never held, hidden in a box or gone). */
export function queryItems(items: Items, q: CountQuery): ItemState[] {
  return Object.values(items).filter((i) => {
    if (i.loc.t !== 'floor') return false
    if (q.zone !== undefined && i.zone !== q.zone) return false
    if (q.room !== undefined && i.loc.room !== q.room) return false
    return q.def === undefined || i.def === q.def
  })
}

export const countItems = (items: Items, q: CountQuery): number => queryItems(items, q).reduce((n, i) => n + qtyOf(i), 0)

/** The first slot nobody lies on, or undefined when the zone is full. Deterministic. */
export function freeSlot(items: Items, zone: ZoneShape): Pt | undefined {
  const taken = zoneItems(items, zone.id).flatMap((i) => (i.loc.t === 'floor' ? [i.loc.at] : []))
  return slotPoints(zone).find((p) => !taken.some((t) => Math.abs(t.x - p.x) < SAME && Math.abs(t.y - p.y) < SAME))
}

export const inRect = (r: Rect, p: Pt): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Where the actor stands to use a zone: just below its middle. */
export const zoneStand = (zone: ZoneShape): Pt => ({ x: zone.rect.x + zone.rect.w / 2, y: Math.min(0.97, zone.rect.y + zone.rect.h + 0.04) })

/** Zone counts as a plain record, to detect changes. */
export const countsKey = (counts: Readonly<Record<string, number>>): string =>
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
