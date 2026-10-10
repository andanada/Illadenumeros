import { useLayoutEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { startingRooms, startingSeats } from './cast'
import { BUS_ROOM } from './riders'

/** Once, at the start: the regulars take their seats, the driver the wheel, the crowd waits at the stop. */
export function useBusStart(): void {
  const cast = useCast()
  const done = useRef(false)
  useLayoutEffect(() => {
    if (done.current) return
    done.current = true
    for (const [id, room] of Object.entries(startingRooms())) {
      const at = cast.positionOf(id)
      if (room !== BUS_ROOM) cast.enterRoom(id, room, at)
    }
    for (const s of startingSeats()) cast.sit(s.id, s.seat, s.at, s.facing)
  }, [cast])
}
