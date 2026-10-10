/** Who is inside the shop floor right now and since when (ms). Customers outside are simply absent. */
export type Presence = Readonly<Record<string, number>>

export interface PlanOptions {
  /** Everybody who may come in, in the order they take turns. */
  readonly order: readonly string[]
  /** Customer with a waiting request: they come in at once and stay while it waits. */
  readonly carrier?: string | undefined
  /** More people who must not be sent away by the clock (someone in the middle of a new hairstyle). */
  readonly keep?: readonly string[]
  readonly now: number
  readonly maxInside?: number
  readonly stayMs?: number
  readonly gapMs?: number
  /** Last time someone came in (ms). */
  readonly lastEnter?: number
}

export type CustomerMove = { readonly type: 'enter'; readonly id: string } | { readonly type: 'leave'; readonly id: string }

/**
 * The gentle life of the shop (pure): customers drift in one at a time, browse a while and leave. The one
 * who carries a request is never sent away by the clock, and always comes in first.
 */
export function planCustomers(inside: Presence, o: PlanOptions): CustomerMove[] {
  const { order, carrier, keep = [], now, maxInside = 2, stayMs = 16_000, gapMs = 6_000, lastEnter = -Infinity } = o
  const moves: CustomerMove[] = []
  for (const [id, since] of Object.entries(inside)) if (id !== carrier && !keep.includes(id) && now - since >= stayMs) moves.push({ type: 'leave', id })
  const staying = Object.keys(inside).filter((id) => !moves.some((m) => m.id === id))
  if (carrier && inside[carrier] === undefined) {
    moves.push({ type: 'enter', id: carrier })
    return moves
  }
  if (staying.length < maxInside && now - lastEnter >= gapMs) {
    const next = order.find((id) => id !== carrier && inside[id] === undefined)
    if (next) moves.push({ type: 'enter', id: next })
  }
  return moves
}

/** The counter spots customers walk to, nearest first; a free one is chosen. */
export const freeSpot = <T extends { readonly id: string }>(spots: readonly T[], taken: readonly string[]): T | undefined => spots.find((s) => !taken.includes(s.id))
