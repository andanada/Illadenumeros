import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { COUNTER_SPOTS, ROOM, STREET_DOOR } from './rooms'
import { planCustomers, type Presence } from '../../shared/customerPlan'

/** Ids of the customers (neighbours who come and go), the shopkeeper, the cat and the delivery person. */
export const CUSTOMERS = ['la-fatima', 'en-kofi', 'la-mei', 'l-avi-ramon'] as const
export const KEEPER = 'senyora-pilar'
export const CAT = 'mixa'
export const COURIER = 'repartidor'

const TICK_MS = 1500
/** Where browsing customers drift to (in front of the shelves, then the middle of the floor). */
const BROWSE = [
  { x: 0.2, y: 0.56 },
  { x: 0.38, y: 0.6 },
  { x: 0.3, y: 0.8 },
  { x: 0.46, y: 0.7 },
] as const

/**
 * The life of the shop, offstage and on: customers come in through the street door, browse and leave;
 * the one who carries a request walks to the counter and waits there. Everything is a plain move of the
 * cast (enterRoom / walkTo), so it works the same with reduced motion (they simply appear).
 */
export function useShopLife(carrier: string | undefined): void {
  const cast = useCast()
  const api = useRef(cast)
  const inside = useRef<Presence>({})
  const lastEnter = useRef(-Infinity)
  const clock = useRef(0)
  const carrierRef = useRef(carrier)

  useLayoutEffect(() => {
    api.current = cast
    carrierRef.current = carrier
  })

  const counterFor = (_id: string) => COUNTER_SPOTS[0]

  const enter = (id: string, now: number): void => {
    const c = api.current
    inside.current = { ...inside.current, [id]: now }
    lastEnter.current = now
    const to = id === carrierRef.current ? counterFor(id).at : (BROWSE[Math.floor(now / TICK_MS) % BROWSE.length] ?? BROWSE[0])
    c.enterRoom(id, ROOM.floor, { x: 0.12, y: 0.7 })
    c.walkTo(id, to)
  }

  const leave = (id: string): void => {
    const c = api.current
    const { [id]: _gone, ...rest } = inside.current
    inside.current = rest
    c.walkTo(id, { x: STREET_DOOR.x + 0.04, y: STREET_DOOR.y + 0.1 }, () => api.current.enterRoom(id, ROOM.street, { x: 0.5, y: 0.7 }))
  }

  // Start of the day: customers are in the street, the cat sleeps on the counter, the courier waits in the bay.
  useLayoutEffect(() => {
    const c = api.current
    for (const id of CUSTOMERS) c.enterRoom(id, ROOM.street, { x: 0.5, y: 0.7 })
    c.enterRoom(COURIER, ROOM.bay, { x: 0.62, y: 0.8 })
    c.sit(CAT, 'taulell-gat', { x: 0.69, y: 0.54 }, 1)
    if (carrierRef.current) {
      inside.current = { [carrierRef.current]: 0 }
      c.enterRoom(carrierRef.current, ROOM.floor, counterFor(carrierRef.current).at)
    }
    // Once, at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The carrier of a new request comes in by themselves.
  useEffect(() => {
    if (!carrier || inside.current[carrier] !== undefined) return
    enter(carrier, clock.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier])

  useEffect(() => {
    const timer = setInterval(() => {
      clock.current += TICK_MS
      const now = clock.current
      for (const move of planCustomers(inside.current, { order: CUSTOMERS, carrier: carrierRef.current, now, lastEnter: lastEnter.current })) {
        if (move.type === 'enter') enter(move.id, now)
        else leave(move.id)
      }
    }, TICK_MS)
    return () => clearInterval(timer)
    // The tick reads everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
