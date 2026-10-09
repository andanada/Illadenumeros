import type { Pose } from '../scene/art'
import type { ErrandPhase } from './types'

/** Pure body language of the neighbour at the counter. */
export function neighbourPose({ phase, arriving, handOut }: { phase: ErrandPhase; arriving: boolean; handOut: boolean }): Pose {
  if (phase === 'thanks') return 'cheer'
  if (arriving) return 'wave'
  if (handOut && (phase === 'asking' || phase === 'checking')) return 'hold'
  return 'idle'
}

export const MAX_QUEUE_SHOWN = 3

export interface Queue {
  /** Neighbours waiting at the door (not counting the one being served). */
  waiting: number
  /** Visit numbers of the ones drawn at the door: the next to come in is first (same face when she enters). */
  shown: readonly number[]
  /** Waiting but not drawn ("+2"). */
  more: number
}

/** Who waits at the door: the board's pending errands minus the one at the counter. */
export function queueOf(pending: number, serving: boolean, visit: number): Queue {
  const waiting = Math.max(0, pending - (serving ? 1 : 0))
  const first = visit + (serving ? 1 : 0)
  const count = Math.min(MAX_QUEUE_SHOWN, waiting)
  const shown = Array.from({ length: count }, (_, i) => first + i)
  return { waiting, shown, more: waiting - count }
}
