import { useState } from 'react'
import type { Item } from '../../../../core/ambit/types'
import type { PlaceRequest } from '../../../requests/useRequests'

export interface ArcadeBubbles {
  /** The warm-up bubble over the Duel cabinet (the first waiting need). */
  readonly warm: boolean
  /** The clerk's bubble (a second waiting need). */
  readonly clerk: boolean
}

/** How many needs are waiting: the day's requests, or what the shell says is pending when the store has none. Pure. */
export function waitingCount(requests: readonly PlaceRequest[], pending: number): number {
  const live = requests.filter((r) => r.status === 'waiting').length
  return requests.length > 0 ? live : pending
}

/** Which bubbles are up: the first need lights the Duel (the warm-up), a second one is the clerk's prize count. Pure. */
export function bubblesFor(waiting: number): ArcadeBubbles {
  return { warm: waiting >= 1, clerk: waiting >= 2 }
}

/** What the clerk's bubble shows: the sum or difference to work out (the question itself), else a question mark. Pure. */
export function clerkNumber(item: Item): string {
  const ops = item.operands
  if (!ops) return '?'
  return `${ops.a}${ops.op === '-' ? '−' : ops.op}${ops.b}`
}

/** The clerk's open request (a small piece of state: she opened it, and closes it). */
export function useClerkRequest(): { open: boolean; start: () => void; close: () => void } {
  const [open, setOpen] = useState(false)
  return { open, start: () => setOpen(true), close: () => setOpen(false) }
}
