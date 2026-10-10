import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { planCustomers, type Presence } from '../customerPlan'

type Pt = { readonly x: number; readonly y: number }

export interface LifeConfig {
  readonly customers: readonly string[]
  /** Room customers come into and the room that stands for the street (never drawn). */
  readonly room: string
  readonly street: string
  /** Where they appear when they come in, and the door they leave by. */
  readonly entry: Pt
  readonly exit: Pt
  /** Where the customer who asks waits, and where the others drift to. */
  readonly ask: Pt
  readonly browse: readonly Pt[]
  /** Staff who walk about their room now and then. */
  readonly staff?: ReadonlyArray<{ readonly id: string; readonly room: string; readonly points: readonly Pt[] }>
}

const TICK_MS = 1500

/**
 * The gentle life of a place: customers come in from the street, browse and leave; the one who carries a
 * request walks to the asking spot and waits. Plain moves of the cast, so with reduced motion they just appear.
 */
export function useCustomerLife(config: LifeConfig, carrier: string | undefined): void {
  const cast = useCast()
  const api = useRef(cast)
  const cfg = useRef(config)
  const inside = useRef<Presence>({})
  const lastEnter = useRef(-Infinity)
  const clock = useRef(0)
  const carrierRef = useRef(carrier)

  useLayoutEffect(() => {
    api.current = cast
    cfg.current = config
    carrierRef.current = carrier
  })

  const enter = (id: string, now: number): void => {
    const c = api.current
    const k = cfg.current
    inside.current = { ...inside.current, [id]: now }
    lastEnter.current = now
    const to = id === carrierRef.current ? k.ask : (k.browse[Math.floor(now / TICK_MS) % k.browse.length] ?? k.ask)
    c.enterRoom(id, k.room, k.entry)
    c.walkTo(id, to)
  }

  const leave = (id: string): void => {
    const c = api.current
    const k = cfg.current
    const { [id]: _gone, ...rest } = inside.current
    inside.current = rest
    c.walkTo(id, k.exit, () => api.current.enterRoom(id, k.street, { x: 0.5, y: 0.7 }))
  }

  useLayoutEffect(() => {
    const c = api.current
    const k = cfg.current
    for (const id of k.customers) c.enterRoom(id, k.street, { x: 0.5, y: 0.7 })
    for (const s of k.staff ?? []) c.enterRoom(s.id, s.room, s.points[0] ?? { x: 0.5, y: 0.7 })
    if (carrierRef.current) {
      inside.current = { [carrierRef.current]: 0 }
      c.enterRoom(carrierRef.current, k.room, k.ask)
    }
    // Once, at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!carrier || inside.current[carrier] !== undefined) return
    enter(carrier, clock.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier])

  useEffect(() => {
    const timer = setInterval(() => {
      clock.current += TICK_MS
      const now = clock.current
      const k = cfg.current
      for (const move of planCustomers(inside.current, { order: k.customers, carrier: carrierRef.current, now, lastEnter: lastEnter.current })) {
        if (move.type === 'enter') enter(move.id, now)
        else leave(move.id)
      }
      const turn = Math.floor(now / TICK_MS)
      for (const s of k.staff ?? []) {
        if (turn % 4 !== 1) continue
        const p = s.points[Math.floor(turn / 4) % s.points.length]
        if (p && (api.current.state.actors[s.id]?.room ?? api.current.defaultRoom) === s.room && api.current.state.selected !== s.id) api.current.walkTo(s.id, p)
      }
    }, TICK_MS)
    return () => clearInterval(timer)
    // The tick reads everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
