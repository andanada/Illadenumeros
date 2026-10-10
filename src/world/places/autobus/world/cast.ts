import { defaultAvatar } from '../../../characters'
import type { ActorSeed } from '../../../sandbox/types'
import { RIDERS, BUS_ROOM, CHILD_ID, DRIVER_ID, PET_ID, REGULARS, STOP_ROOM } from './riders'
import { SEAT_SPOTS, WHEEL_SEAT } from './busLayout'
import { arrivalsAt } from './riders'

/** The cast at the start: the child, the driver, her pet, and the whole town of riders (most of them «fora»). */
export function busSeeds(avatar = defaultAvatar('nyx', 'rosa')): ActorSeed[] {
  const arrivals = arrivalsAt(1, (id) => (REGULARS.includes(id) ? BUS_ROOM : 'fora'))
  const riders = RIDERS.map<ActorSeed>((r) => {
    const seat = SEAT_SPOTS[REGULARS.indexOf(r.id)]
    const waiting = arrivals.find((a) => a.id === r.id)
    return { id: r.id, kind: 'neighbour', name: r.name, neighbour: r.neighbour, at: seat?.at ?? waiting?.at ?? { x: 0.5, y: 0.8 }, facing: seat?.facing ?? 1 }
  })
  return [
    { id: CHILD_ID, kind: 'avatar', name: 'la Laia', at: { x: 0.28, y: 0.86 }, avatar },
    { id: DRIVER_ID, kind: 'neighbour', name: 'en Jordi', neighbour: 'en-jordi', at: WHEEL_SEAT.at, facing: -1 },
    { id: PET_ID, kind: 'pet', name: 'la Nyx', pet: 'nyx', at: { x: 0.42, y: 0.88 }, follow: CHILD_ID, loves: ['os'] },
    ...riders,
  ]
}

/** Who sits where when the day starts (seats of the three regulars, the driver at the wheel). */
export function startingSeats(): ReadonlyArray<{ id: string; seat: string; at: { x: number; y: number }; facing: 1 | -1 }> {
  return [
    ...REGULARS.map((id, i) => ({ id, seat: SEAT_SPOTS[i]?.id ?? 'seient-1', at: SEAT_SPOTS[i]?.at ?? { x: 0.1, y: 0.67 }, facing: (SEAT_SPOTS[i]?.facing ?? 1) as 1 | -1 })),
    { id: DRIVER_ID, seat: WHEEL_SEAT.id, at: WHEEL_SEAT.at, facing: -1 },
  ]
}

/** Who starts at the stop (the crowd of stop 1) and in which room everyone starts. */
export function startingRooms(): Record<string, string> {
  const arrivals = arrivalsAt(1, (id) => (REGULARS.includes(id) ? BUS_ROOM : 'fora'))
  return Object.fromEntries(RIDERS.map((r) => [r.id, REGULARS.includes(r.id) ? BUS_ROOM : arrivals.some((a) => a.id === r.id) ? STOP_ROOM : 'fora']))
}
