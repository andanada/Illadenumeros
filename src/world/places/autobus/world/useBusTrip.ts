import { useCallback, useEffect, useRef, useState } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import type { Jump } from '../../../../games/cursa-recta/jumpLogic'
import { honk, initialBus, signal, toggleNight, toggleWipers, type BusState } from '../freePlay'
import { busSfx } from '../busSfx'
import { arrivalsAt, AWAY_ROOM, BUS_ROOM, canLeave, CHILD_ID, departures, DRIVER_ID, STOP_ROOM } from './riders'
import { pedalAllowed, stopAfter, tripMs } from './route'
import { WHEEL_SEAT } from './busLayout'

export interface BusTrip {
  bus: BusState
  setBus: (next: BusState) => void
  requested: boolean
  ready: boolean
  why: string | undefined
  jump: (jump: Jump) => void
  honkHorn: () => void
  toggleLights: () => void
  wipers: () => void
  indicator: (side: 'left' | 'right') => void
  /** The red button on the pole: «parada demanada». */
  pressStop: () => void
}

/** The bus on its road (inside a CastProvider): trips between numbered stops, people leaving and arriving. */
export function useBusTrip(): BusTrip {
  const cast = useCast()
  const [bus, setBus] = useState<BusState>(initialBus)
  const [requested, setRequested] = useState(false)
  const live = useRef(cast)
  const busRef = useRef(bus)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    live.current = cast
    busRef.current = bus
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  const roomOf = useCallback((id: string): string => live.current.state.actors[id]?.room ?? live.current.defaultRoom, [])
  const driver = cast.state.actors[DRIVER_ID]
  const driverSeated = driver?.seat === WHEEL_SEAT.id && (driver.room ?? cast.defaultRoom) === BUS_ROOM
  const ready = canLeave(driverSeated, cast.state.actors[CHILD_ID]?.room ?? cast.defaultRoom)
  const why = bus.driving ? undefined : !driverSeated ? 'Falta algú al volant: seu en Jordi al seu lloc!' : !ready ? 'Falta la Laia: puja a l’autobús!' : undefined

  const arrive = useCallback(
    (stop: number) => {
      const c = live.current
      setBus({ ...busRef.current, driving: false, stop })
      for (const p of arrivalsAt(stop, roomOf)) c.enterRoom(p.id, STOP_ROOM, p.at)
      busSfx.brake()
      c.announce(`Hem arribat a la parada ${stop}. Les portes s’obren.`)
      setRequested(false)
    },
    [roomOf],
  )

  const jump = useCallback(
    (j: Jump) => {
      const c = live.current
      const now = busRef.current
      if (now.driving || !pedalAllowed(now.stop, j)) return
      if (!canLeave(c.state.actors[DRIVER_ID]?.seat === WHEEL_SEAT.id, c.state.actors[CHILD_ID]?.room ?? c.defaultRoom)) return
      for (const p of departures(roomOf, c.state.selected)) c.enterRoom(p.id, AWAY_ROOM, p.at)
      const to = stopAfter(now.stop, j)
      setBus({ ...now, driving: true, indicator: 'off' })
      if (Math.abs(j) >= 10) busSfx.zoom()
      else busSfx.engine()
      c.announce(`L’autobús surt cap a la parada ${to}.`)
      const ms = tripMs(j, c.reduced)
      timer.current = setTimeout(() => arrive(to), ms)
    },
    [arrive, roomOf],
  )

  return {
    bus,
    setBus,
    requested,
    ready,
    why,
    jump,
    honkHorn: () => {
      busSfx.horn()
      setBus((b) => honk(b))
    },
    toggleLights: () => setBus((b) => toggleNight(b)),
    wipers: () => setBus((b) => toggleWipers(b)),
    indicator: (side) => setBus((b) => signal(b, side)),
    pressStop: () => {
      busSfx.tick()
      setRequested(true)
      live.current.announce('Parada demanada. Ding!')
    },
  }
}
