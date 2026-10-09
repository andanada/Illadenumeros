import { SEATS } from './errands/seatsLogic'

/** Free play on the bus (no coins: only errands give coins). Pure state helpers. */

export type Indicator = 'off' | 'left' | 'right'

export interface BusState {
  driving: boolean
  /** Stops reached so far (names the stop and seeds who waits there). */
  stop: number
  /** Passenger seeds, seat by seat in ten-frame order. */
  seated: readonly string[]
  /** Passenger seeds waiting at the stop. */
  waiting: readonly string[]
  indicator: Indicator
  wipers: boolean
  night: boolean
  /** Bumped by every honk (the bus bounces). */
  honks: number
}

/** People waiting at the n-th stop: 2 to 4, always the same for the same stop. */
export function crowdAt(stop: number): string[] {
  const n = 2 + (Math.abs(stop * 7 + 3) % 3)
  return Array.from({ length: n }, (_, i) => `parada-${stop}-${i}`)
}

export const initialBus = (): BusState => ({
  driving: false,
  stop: 1,
  seated: ['bus-a', 'bus-b', 'bus-c'],
  waiting: crowdAt(1),
  indicator: 'off',
  wipers: false,
  night: false,
  honks: 0,
})

/** A waiting passenger gets on (only with the bus stopped and a free seat). */
export function board(state: BusState, id: string): BusState {
  if (state.driving || state.seated.length >= SEATS || !state.waiting.includes(id)) return state
  return { ...state, waiting: state.waiting.filter((p) => p !== id), seated: [...state.seated, id] }
}

/** A seated passenger gets off onto the stop (only with the bus stopped). */
export function alight(state: BusState, id: string): BusState {
  if (state.driving || !state.seated.includes(id)) return state
  return { ...state, seated: state.seated.filter((p) => p !== id), waiting: [...state.waiting, id] }
}

/** Go / stop. Stopping arrives at the next stop: whoever got off goes home and new people wait. */
export function toggleDrive(state: BusState): BusState {
  if (!state.driving) return { ...state, driving: true, indicator: 'off' }
  const stop = state.stop + 1
  return { ...state, driving: false, stop, waiting: crowdAt(stop) }
}

/** Left / right indicator: tapping the lit one switches it off. */
export const signal = (state: BusState, side: 'left' | 'right'): BusState => ({
  ...state,
  indicator: state.indicator === side ? 'off' : side,
})

export const toggleWipers = (state: BusState): BusState => ({ ...state, wipers: !state.wipers })
export const toggleNight = (state: BusState): BusState => ({ ...state, night: !state.night })
export const honk = (state: BusState): BusState => ({ ...state, honks: state.honks + 1 })
