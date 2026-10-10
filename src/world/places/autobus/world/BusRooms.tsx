import { Anchor } from '../../../sandbox/Anchor'
import { useCast } from '../../../sandbox/CastContext'
import { Stage } from '../../../sandbox/Stage'
import type { Errand } from '../../../errands/useErrand'
import { BUS_BLOCKS, BUS_DOOR, BUS_FLOOR_TOP, BUS_SEATS, RACK, STOP_BENCH, STOP_BLOCKS, STOP_DOOR, STOP_FLOOR_TOP, KIOSK } from './busLayout'
import { BusInterior } from './BusInterior'
import { BusSpots } from './BusSpots'
import { BUS_ROOM } from './riders'
import { StopScene } from './StopScene'
import type { BusRequests } from './useBusRequests'
import type { BusTrip } from './useBusTrip'

const cap = (t: string): string => `${t[0]?.toUpperCase() ?? ''}${t.slice(1)}`

export interface BusRoomsProps {
  view: string
  trip: BusTrip
  req: BusRequests
  errand: Errand
  onPole: () => void
}

/** The room the child is looking at (the bus, or the stop outside) with the bubbles of the people who need something. */
export function BusRooms({ view, trip, req, errand, onPole }: BusRoomsProps) {
  const cast = useCast()
  const seats = req.mode.kind === 'seats' && req.active !== undefined
  const sign = seats ? (errand.hintLevel >= 1 ? String(req.aboard) : '?') : `PARADA ${trip.bus.stop}`
  const inBus = view === BUS_ROOM
  return (
    <Stage
      key={view}
      label={inBus ? 'Dins l’autobús' : `La parada ${trip.bus.stop}`}
      room={view}
      floorTop={inBus ? BUS_FLOOR_TOP : STOP_FLOOR_TOP}
      backdrop={inBus ? <BusInterior requested={trip.requested} sign={sign} /> : <StopScene />}
      blocks={inBus ? BUS_BLOCKS : STOP_BLOCKS}
      seats={inBus ? BUS_SEATS : STOP_BENCH}
      doors={inBus ? (trip.bus.driving ? [] : [BUS_DOOR]) : [STOP_DOOR]}
      surfaces={inBus ? [RACK] : [KIOSK]}
      switcher={false}
    >
      {inBus && <BusSpots requested={trip.requested} onPole={onPole} onStopButton={trip.pressStop} />}
      {req.bubbles.map((b) => {
        const name = cast.seeds[b.carrier]?.name ?? 'algú'
        const done = req.active === b.id && errand.phase === 'thanks'
        return (
          <Anchor
            key={b.id}
            actorId={b.carrier}
            state={done ? 'done' : b.waiting || req.active === b.id ? 'waiting' : 'calm'}
            {...(b.facts ? { number: b.facts.number, icon: <span className="text-2xl">{b.facts.icon}</span> } : { icon: <span className="text-2xl">🚌</span> })}
            label={`${cap(name)} necessita ajuda a l’autobús${b.facts ? `: ${b.facts.number}` : ''}`}
            onActivate={() => req.activate(b.id)}
          />
        )
      })}
    </Stage>
  )
}
