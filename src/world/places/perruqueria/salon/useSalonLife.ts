import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { planCustomers, type Presence } from '../../shared/customerPlan'
import { SEATS, STREET, STREET_DOOR, ROOM, WAITING } from './layout'

/** The customers of the salon (they come, wait on the sofa, sit in a chair and leave). */
export const CUSTOMERS = ['la-fatima', 'en-kofi', 'la-mei', 'l-avi-ramon'] as const
export const STYLIST = 'la-nuria'

const TICK_MS = 1500
const STAY_MS = 40_000
const FREE_ORDER = [...WAITING, 'cadira-2', 'rentapaus'] as const

export interface SalonLifeOptions {
  /** The customer whose wish is waiting: first in, in the chair, never sent away by the clock. */
  carrier: string | undefined
  /** Customers in the middle of a restyle stay until it is done. */
  keep: readonly string[]
  /** A customer left: their restyle starts over for the next visit. */
  onLeft: (id: string) => void
}

/**
 * The life of the salon: customers drift in, sit (the one who asks, in chair 1) and leave when they are
 * done or have waited long enough. Plain cast moves, so with reduced motion they simply appear.
 */
export function useSalonLife({ carrier, keep, onLeft }: SalonLifeOptions): void {
  const cast = useCast()
  const api = useRef(cast)
  const opts = useRef({ carrier, keep, onLeft })
  const inside = useRef<Presence>({})
  const lastEnter = useRef(-Infinity)
  const clock = useRef(0)

  useLayoutEffect(() => {
    api.current = cast
    opts.current = { carrier, keep, onLeft }
  })

  const seatFor = (id: string): string => {
    const actors = api.current.state.actors
    const taken = new Set(Object.values(actors).flatMap((a) => (a.seat ? [a.seat] : [])))
    if (id === opts.current.carrier && !taken.has('cadira-1')) return 'cadira-1'
    return FREE_ORDER.find((s) => !taken.has(s)) ?? 'sofa-2'
  }

  const sitDown = (id: string): void => {
    const seat = SEATS.find((s) => s.id === seatFor(id))
    if (!seat) return
    api.current.walkTo(id, seat.at, () => api.current.sit(id, seat.id, seat.at, seat.facing))
  }

  const enter = (id: string, now: number): void => {
    inside.current = { ...inside.current, [id]: now }
    lastEnter.current = now
    api.current.enterRoom(id, ROOM, { x: 0.12, y: 0.78 })
    sitDown(id)
  }

  const leave = (id: string): void => {
    const { [id]: _gone, ...rest } = inside.current
    inside.current = rest
    const c = api.current
    c.stand(id)
    c.walkTo(id, { x: STREET_DOOR.at.x + 0.05, y: STREET_DOOR.at.y + 0.1 }, () => {
      api.current.enterRoom(id, STREET, { x: 0.5, y: 0.7 })
      opts.current.onLeft(id)
    })
  }

  useLayoutEffect(() => {
    const c = api.current
    for (const id of CUSTOMERS) c.enterRoom(id, STREET, { x: 0.5, y: 0.7 })
    const first = opts.current.carrier
    if (first) {
      inside.current = { [first]: 0 }
      const seat = SEATS.find((s) => s.id === 'cadira-1')
      if (seat) {
        c.enterRoom(first, ROOM, seat.at)
        c.sit(first, seat.id, seat.at, seat.facing)
      }
    }
    // Once, at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!carrier || inside.current[carrier] !== undefined) return
    enter(carrier, clock.current)
    // A new wish brings its customer in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier])

  useEffect(() => {
    const timer = setInterval(() => {
      clock.current += TICK_MS
      const now = clock.current
      const o = opts.current
      for (const move of planCustomers(inside.current, { order: CUSTOMERS, carrier: o.carrier, keep: o.keep, now, stayMs: STAY_MS, maxInside: 3, lastEnter: lastEnter.current })) {
        if (move.type === 'enter') enter(move.id, now)
        else leave(move.id)
      }
    }, TICK_MS)
    return () => clearInterval(timer)
    // The tick reads everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
