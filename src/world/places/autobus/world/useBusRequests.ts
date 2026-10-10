import { useEffect, useRef, useState } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import type { Errand } from '../../../errands/useErrand'
import type { PlaceRequest } from '../../../requests/useRequests'
import { useCast } from '../../../sandbox/CastContext'
import { seatsValue } from '../errands/seatsLogic'
import { bubbleFacts, modeOf, type BubbleFacts, type RequestMode } from './requestMode'
import { seatsSetup } from './route'
import { BUS_ROOM, REGULARS, RIDER_IDS } from './riders'
import type { BusTrip } from './useBusTrip'

export interface Bubble {
  readonly id: string
  readonly carrier: string
  readonly waiting: boolean
  readonly facts: BubbleFacts | undefined
}

const LOCAL_ID = 'local'

/** The character that carries the n-th bubble: the one the request names when she rides, else a regular, in turn. */
export const carrierOf = (actorId: string, n: number): string => (REGULARS.includes(actorId) ? actorId : (REGULARS[n % REGULARS.length] ?? 'senyora-pilar'))

/** The bubbles to show: the day's requests, or one local bubble when the shell says someone waits but the store does not know. */
export function bubblesOf(requests: readonly PlaceRequest[], pending: number, errand: Errand): Bubble[] {
  const source: ReadonlyArray<{ id: string; actorId: string; waiting: boolean }> =
    requests.length > 0 ? requests.map((r) => ({ id: r.id, actorId: r.actorId, waiting: r.status === 'waiting' })) : pending > 0 ? [{ id: LOCAL_ID, actorId: REGULARS[0] ?? '', waiting: true }] : []
  const used = new Set<string>()
  return source.slice(0, 2).map((r, n) => {
    let carrier = carrierOf(r.actorId, n)
    if (used.has(carrier)) carrier = REGULARS.find((c) => !used.has(c)) ?? carrier
    used.add(carrier)
    return { id: r.id, carrier, waiting: r.waiting, facts: n === 0 ? bubbleFacts(errand.item) : undefined }
  })
}

export interface BusRequests {
  readonly bubbles: readonly Bubble[]
  readonly active: string | undefined
  readonly mode: RequestMode
  readonly aboard: number
  activate: (id: string) => void
  /** Hands over the answer the world gives (people aboard, or the stop she opened the doors at). */
  handOver: () => void
  close: () => void
}

/** The request machinery of the bus: bubbles, the stage set for the one she opened, and her answer. */
export function useBusRequests(errand: Errand, trip: BusTrip, requests: readonly PlaceRequest[], pending: number, callSignal: number): BusRequests {
  const cast = useCast()
  const [active, setActive] = useState<string | undefined>(undefined)
  const mode = modeOf(errand.item)
  const bubbles = bubblesOf(requests, pending, errand)
  const aboard = RIDER_IDS.filter((id) => (cast.state.actors[id]?.room ?? cast.defaultRoom) === BUS_ROOM).length
  const latest = useRef({ errand, trip, bubbles, active })
  useEffect(() => {
    latest.current = { errand, trip, bubbles, active }
  })

  const activate = (id: string): void => {
    const now = latest.current
    if (now.trip.bus.driving) return
    const bubble = now.bubbles.find((b) => b.id === id)
    if (!bubble) return
    const m = modeOf(now.errand.item)
    if (m.kind === 'seats') for (const p of seatsSetup(m.task, bubble.carrier)) cast.enterRoom(p.id, p.room, p.at)
    else if (m.kind === 'road') now.trip.setBus({ ...now.trip.bus, stop: m.task.start })
    cast.select(cast.state.selected)
    setActive(id)
  }

  const seenSignal = useRef(callSignal)
  useEffect(() => {
    if (seenSignal.current === callSignal) return
    seenSignal.current = callSignal
    const first = latest.current.bubbles[0]
    if (first) activate(first.id)
    // `activate` reads everything through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSignal])

  const carrier = bubbles.find((b) => b.id === active)?.carrier
  useEffect(() => {
    if (errand.phase === 'thanks' && carrier) cast.emote(carrier, 'riure', 2600)
    // Only when the thanks arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand.phase])

  const handOver = (): void => {
    if (mode.kind === 'seats') void errand.submit(choiceForValue(String(seatsValue(mode.task, aboard)), errand.item))
    else if (mode.kind === 'road') void errand.submit(choiceForValue(String(trip.bus.stop), errand.item))
  }
  const close = (): void => {
    errand.next()
    setActive(undefined)
  }
  return { bubbles, active, mode, aboard, activate, handOver, close }
}
