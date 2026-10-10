import { useEffect, useMemo } from 'react'
import { ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import type { PlaceRequest } from '../../../requests/useRequests'
import { useCast } from '../../../sandbox/CastContext'
import { worldSfx } from '../../../scene/worldSfx'
import { RequestCard } from '../../shared/RequestCard'
import { RoomSwitcher } from '../../shared/RoomSwitcher'
import { BusLookContext, type BusLook } from '../interior/busLook'
import { BusRooms } from './BusRooms'
import { DriveDock } from './DriveDock'
import { RouteStrip } from './RouteStrip'
import { BUS_POLE } from './busLayout'
import { BUS_ROOM, CHILD_ID, STOP_ROOM } from './riders'
import { useBusRequests } from './useBusRequests'
import { useBusStart } from './useBusStart'
import { useBusTrip } from './useBusTrip'

const pill = 'min-h-16 rounded-full px-5 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50'

export interface BusWorldProps {
  errand: Errand
  requests: readonly PlaceRequest[]
  pending: number
  callSignal: number
  onExit: () => void
}

/** Everything that happens inside the providers: the rooms, the road, the driver's dock and the request card. */
export function BusWorld({ errand, requests, pending, callSignal, onExit }: BusWorldProps) {
  const cast = useCast()
  useBusStart()
  const trip = useBusTrip()
  const req = useBusRequests(errand, trip, requests, pending, callSignal)
  // The camera stays with the child: if somebody else walks out through a door, you are back with her.
  const childRoom = cast.state.actors[CHILD_ID]?.room ?? cast.defaultRoom
  const view = childRoom === STOP_ROOM ? STOP_ROOM : BUS_ROOM
  const selectedRoom = cast.state.actors[cast.state.selected]?.room ?? cast.defaultRoom
  useEffect(() => {
    if (selectedRoom !== view) cast.select(CHILD_ID)
  }, [selectedRoom, view, cast])

  const look = useMemo<BusLook>(
    () => ({ driving: trip.bus.driving, night: trip.bus.night, wipers: trip.bus.wipers, indicator: trip.bus.indicator, honks: trip.bus.honks, drive: () => undefined }),
    [trip.bus],
  )

  const hold = (): void => {
    const who = cast.state.selected
    cast.walkTo(who, { x: BUS_POLE.x - 0.045, y: BUS_POLE.y + 0.06 }, () => {
      cast.face(who, { x: BUS_POLE.x, y: BUS_POLE.y })
      cast.emote(who, 'salut', 60_000)
      cast.announce(`${cast.seeds[who]?.name ?? 'Algú'} s’agafa a la barra.`)
    })
  }

  const asking = errand.phase === 'asking'
  const busy = req.active !== undefined
  const dock = (
    <DriveDock
      stop={trip.bus.stop}
      driving={trip.bus.driving}
      ready={trip.ready}
      why={view === BUS_ROOM ? trip.why : undefined}
      night={trip.bus.night}
      wipers={trip.bus.wipers}
      indicator={trip.bus.indicator}
      toys={!busy}
      onJump={trip.jump}
      onHonk={trip.honkHorn}
      onNight={trip.toggleLights}
      onWipers={trip.wipers}
      onIndicator={trip.indicator}
    />
  )
  const roadCard = req.mode.kind === 'road'
  const cardBody =
    req.mode.kind === 'seats' ? (
      <>
        {errand.hintLevel >= 1 && <p className="rounded-full bg-[var(--world-surface-2,#ffeccd)] px-4 py-1 text-xl font-bold tabular-nums">A l’autobús: {req.aboard}</p>}
        <button type="button" disabled={!asking} onClick={req.handOver} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
          <span aria-hidden="true">🚪 </span>Tanca les portes
        </button>
      </>
    ) : roadCard ? (
      <div className="flex flex-col items-center gap-2">
        {view === BUS_ROOM && dock}
        <button type="button" disabled={!asking || trip.bus.driving} onClick={req.handOver} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
          <span aria-hidden="true">🚪 </span>Obre les portes
        </button>
      </div>
    ) : null

  const panel = busy && req.mode.kind === 'panel'
  const card = busy ? (
    <RequestCard errand={errand} placeName="l’Autobús" onClose={req.close} inline={req.mode.kind === 'seats'}>
      {cardBody}
      {panel && <ErrandTaskArea errand={errand} />}
    </RequestCard>
  ) : null

  return (
    <BusLookContext.Provider value={look}>
      <div className="relative flex h-dvh min-h-[34rem] w-full flex-col overflow-hidden bg-[#2b2440]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <BusRooms view={view} trip={trip} req={req} errand={errand} onPole={hold} />
        </div>
        <div className="flex flex-col items-center gap-2 px-2 pb-2 pt-2">
          {view === BUS_ROOM && <RouteStrip stop={trip.bus.stop} driving={trip.bus.driving} />}
          {!busy && view === BUS_ROOM ? dock : null}
          {panel ? null : card}
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <RoomSwitcher room={view} className="!pointer-events-auto !static" />
            <div className="flex min-h-[4.75rem] items-center max-sm:basis-full max-sm:pr-36 sm:min-h-0">
              <button
                type="button"
                onClick={() => {
                  worldSfx.doorClose()
                  onExit()
                }}
                className={`${pill} flex items-center gap-2 bg-white text-[var(--world-ink,#2b2440)]`}
              >
                <span aria-hidden="true">🚏</span>Surt al carrer
              </button>
            </div>
          </div>
        </div>
        {panel && <div className="absolute inset-0 z-[70] flex items-center overflow-y-auto bg-[#2b2440]/45 p-3">{card}</div>}
      </div>
    </BusLookContext.Provider>
  )
}
