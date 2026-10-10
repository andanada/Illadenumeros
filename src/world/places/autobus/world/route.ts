import { LINE_MAX, LINE_MIN, type Jump } from '../../../../games/cursa-recta/jumpLogic'
import type { SeatsTask } from '../errands/seatsLogic'
import { RIDER_IDS, SEAT_IDS, aisleSpot, waitSpot, type Placement } from './riders'
import { AWAY_ROOM, BUS_ROOM, STOP_ROOM } from './riders'
import type { RoadTask } from '../errands/roadLogic'

/** The road is a number line: every stop has its number. A trip moves the bus by one of the pedals' jumps. */
export const stopAfter = (stop: number, jump: Jump): number => Math.min(LINE_MAX, Math.max(LINE_MIN, stop + jump))

/** Pedal that is allowed from `stop` (the road ends at both sides). */
export const pedalAllowed = (stop: number, jump: Jump): boolean => stop + jump >= LINE_MIN && stop + jump <= LINE_MAX

/** Milliseconds a trip lasts: a bit more for ten stops. Instant when the child prefers reduced motion. */
export const tripMs = (jump: Jump, reduced: boolean): number => (reduced ? 0 : Math.abs(jump) >= 10 ? 1400 : 900)

/** The seats task can be played with real people: everyone fits among the twelve riders. */
export const seatsInWorld = (t: SeatsTask): boolean => t.start + t.waiting <= RIDER_IDS.length

/** The road task is played by driving the bus when it is «go» and its stops are on the line (always true by construction). */
export const roadInWorld = (t: RoadTask): boolean => t.mode === 'go'

/**
 * Sets the stage for a passengers request: `start` people aboard, `waiting` at the stop, the rest away.
 * The carrier of the bubble is always one of those aboard, so she can see the bubble where she is.
 */
export function seatsSetup(t: SeatsTask, carrier: string): Placement[] {
  const order = [carrier, ...RIDER_IDS.filter((id) => id !== carrier)]
  return order.map((id, i) => {
    if (i < t.start) return { id, room: BUS_ROOM, at: aisleSpot(i) }
    if (i < t.start + t.waiting) return { id, room: STOP_ROOM, at: waitSpot(i - t.start) }
    return { id, room: AWAY_ROOM, at: { x: 0.5, y: 0.8 } }
  })
}

/** Seat id for the n-th seated person (wraps around the seats). */
export const seatFor = (n: number): string => SEAT_IDS[n % SEAT_IDS.length] ?? 'seient-1'

const SHOWN = 11

/** The window of stops around the bus: tens are always numbered, so the line reads as a number line. */
export function stopsAround(stop: number): number[] {
  const lo = Math.min(LINE_MAX - SHOWN + 1, Math.max(LINE_MIN, stop - 5))
  return Array.from({ length: SHOWN }, (_, i) => lo + i)
}
