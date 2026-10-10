import type { Item } from '../../../../core/ambit/types'
import { roadFromItem, type RoadTask } from '../errands/roadLogic'
import { seatsFromItem, type SeatsTask } from '../errands/seatsLogic'
import { roadInWorld, seatsInWorld } from './route'

/**
 * How a request is played:
 * - seats: with real people walking on and off the bus (the seats model, when everybody fits among the riders);
 * - road: by driving the bus along the numbered stops (the «go» model);
 * - panel: with the existing task (windows of the bus, the number line, price-tag answers) in a docked card.
 */
export type RequestMode =
  | { readonly kind: 'seats'; readonly task: SeatsTask }
  | { readonly kind: 'road'; readonly task: RoadTask }
  | { readonly kind: 'panel' }

export function modeOf(item: Item): RequestMode {
  const seats = seatsFromItem(item)
  if (seats) return seatsInWorld(seats) ? { kind: 'seats', task: seats } : { kind: 'panel' }
  const road = roadFromItem(item)
  if (road && roadInWorld(road)) return { kind: 'road', task: road }
  return { kind: 'panel' }
}

export interface BubbleFacts {
  readonly icon: string
  /** What the bubble shows next to the icon: how many to move, never the answer. */
  readonly number: string
}

/** Icon and number for the bubble of the current item. */
export function bubbleFacts(item: Item): BubbleFacts {
  const seats = seatsFromItem(item)
  if (seats) return { icon: '🚶', number: seats.mode === 'on' ? `+${seats.b}` : seats.mode === 'off' ? `−${seats.b}` : '?' }
  const road = roadFromItem(item)
  if (road?.mode === 'go') return { icon: '🚌', number: `${road.op === '+' ? '+' : '−'}${road.b}` }
  return { icon: '🚌', number: '?' }
}
