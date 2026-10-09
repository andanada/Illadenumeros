import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ErrandPerson } from '../../errands/ErrandPerson'
import { ErrandRegion, ErrandTaskArea } from '../../errands/ErrandStage'
import { useErrand, type Errand } from '../../errands/useErrand'
import { Grain } from '../../scene/art'
import { Scene } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import type { PlaceProps } from '../types'
import { AUTOBUS_GAME_ID, AUTOBUS_SKILLS } from './autobusSkills'
import { AUTOBUS_ADAPTERS } from './errands/autobusAdapters'
import { initialBus, toggleDrive, type BusState } from './freePlay'
import { BusControls } from './interior/BusControls'
import { BusLookContext, type BusLook } from './interior/busLook'
import { FreeBus } from './interior/FreeBus'
import { StreetBackdrop } from './interior/StreetBackdrop'
import { useBusViewport, type BusViewport } from './interior/useBusViewport'

/** How long the street scrolls for one jump along the line (ms), plus a bit per stop. */
const PULSE_MS = 380
const PULSE_PER_STOP_MS = 45

function Waiting({ onCall }: { onCall: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.8rem] bg-white/85 px-5 py-4 text-center shadow-[var(--world-shadow-soft)]">
      <p className="text-xl font-bold text-[var(--world-ink,#2b2440)]">Ningú espera a la parada.</p>
      <button
        type="button"
        onClick={onCall}
        className="min-h-16 rounded-full bg-[var(--world-coral,#ff6b5b)] px-6 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5"
      >
        <span aria-hidden="true">🔔 </span>Fes venir un veí
      </button>
    </div>
  )
}

/** The street scrolls while the bus drives, and for a moment after each jump along the line. */
function useDrivePulse(): { pulsing: boolean; drive: (stops: number) => void } {
  const [count, setCount] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const drive = useCallback((stops: number) => {
    setCount((n) => n + 1)
    const t = setTimeout(() => setCount((n) => Math.max(0, n - 1)), PULSE_MS + PULSE_PER_STOP_MS * stops)
    timers.current = [...timers.current, t]
  }, [])
  return { pulsing: count > 0, drive }
}

interface LayoutProps {
  errand: Errand
  active: boolean
  bus: BusState
  onBus: (next: BusState) => void
  onCall: () => void
  vp: BusViewport
}

/** What stands on the pavement (the neighbour who asks) and what happens on the road (the task, or free play). */
function Stage({ errand, active, bus, onBus, onCall, vp }: LayoutProps) {
  const kind = errand.task?.adapterId
  const taskOwnsTheBus = active && kind !== undefined
  const person: ReactNode = active ? (
    <ErrandPerson errand={errand} size={vp.neighbour} compact={vp.portrait} />
  ) : (
    <Waiting onCall={onCall} />
  )
  const road: ReactNode = taskOwnsTheBus ? (
    <ErrandTaskArea errand={errand} />
  ) : (
    <>
      <FreeBus bus={bus} onChange={onBus} passenger={vp.passenger} portrait={vp.portrait} />
      {active && <ErrandTaskArea errand={errand} />}
    </>
  )
  const controls = <BusControls bus={bus} onChange={onBus} canDrive={!active} compact={vp.portrait} />

  if (vp.portrait) {
    return (
      <div className="relative flex flex-col gap-3 px-3 pb-28 pt-[84px]">
        <div className="flex min-h-0 items-end">{person}</div>
        <div className="flex flex-col gap-2">{road}</div>
        {controls}
      </div>
    )
  }
  return (
    <div className="relative grid h-full grid-rows-[minmax(0,1fr)_auto] gap-1 px-4 pb-[4.5rem] pt-[84px]">
      <div className="relative z-10 flex min-h-0 items-start justify-between gap-4">
        <div className="min-w-0 self-start">{person}</div>
        <div className="shrink-0 self-start pt-2">{controls}</div>
      </div>
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-2">{road}</div>
    </div>
  )
}

/**
 * L’Autobús: a double-decker on a street that glides by. Free play: drive, honk, indicators, wipers,
 * day / night and passengers on and off. Errands: passengers on / off the two ten-frames of seats, or
 * driving along the number-line road to the right stop.
 */
export default function AutobusPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const [bus, setBus] = useState<BusState>(initialBus)
  const [active, setActive] = useState(pending > 0)
  const vp = useBusViewport()
  const { pulsing, drive } = useDrivePulse()
  const errand = useErrand({
    gameId: AUTOBUS_GAME_ID,
    skillIds: AUTOBUS_SKILLS,
    adapters: AUTOBUS_ADAPTERS,
    onSolved,
    ...(forced ? { forced } : {}),
  })

  /** A neighbour arrives: the bus pulls in at the stop. */
  const arrive = (): void => {
    setActive(true)
    setBus((b) => (b.driving ? toggleDrive(b) : b))
  }

  // The HUD's board rang the bell (state adjusted during render, no effect needed).
  const [seenSignal, setSeenSignal] = useState(callSignal)
  if (seenSignal !== callSignal) {
    setSeenSignal(callSignal)
    arrive()
  }

  const leave = (): void => {
    const solved = errand.phase === 'thanks'
    errand.next()
    if (!solved || pending <= 0) setActive(false)
  }
  const call = (): void => {
    worldSfx.doorbell()
    arrive()
  }

  const look = useMemo<BusLook>(
    () => ({ driving: bus.driving || pulsing, night: bus.night, wipers: bus.wipers, indicator: bus.indicator, honks: bus.honks, drive }),
    [bus, pulsing, drive],
  )
  const shown = { ...errand, next: leave }
  const stage = <Stage errand={shown} active={active} bus={bus} onBus={setBus} onCall={call} vp={vp} />

  return (
    <BusLookContext.Provider value={look}>
      <Scene label="L’Autobús" className={vp.portrait ? 'min-h-full w-full' : 'h-full min-h-[38rem] w-full'}>
        <div className={`relative w-full overflow-x-hidden ${vp.portrait ? 'min-h-dvh' : 'h-full'}`}>
          <StreetBackdrop />
          {active ? (
            <ErrandRegion errand={shown} placeName="l’Autobús" className={vp.portrait ? '' : 'h-full'}>
              {stage}
            </ErrandRegion>
          ) : (
            <div className={vp.portrait ? '' : 'h-full'}>{stage}</div>
          )}
          <button
            type="button"
            onClick={() => {
              worldSfx.doorClose()
              onExit()
            }}
            className="absolute bottom-3 left-3 z-30 flex min-h-16 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
          >
            <span aria-hidden="true">🚏</span>Surt al carrer
          </button>
          <Grain />
        </div>
      </Scene>
    </BusLookContext.Provider>
  )
}
