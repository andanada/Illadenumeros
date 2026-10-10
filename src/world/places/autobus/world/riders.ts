import type { Pt } from '../../../sandbox/logic/actorMachine'
import { crowdAt } from '../freePlay'

/** Rooms of the bus place: the bus itself, the bus stop outside, and «fora» (people who are somewhere else in town). */
export const BUS_ROOM = 'bus'
export const STOP_ROOM = 'parada'
export const AWAY_ROOM = 'fora'

export const CHILD_ID = 'laia'
export const DRIVER_ID = 'en-jordi'
export const PET_ID = 'nyx'

export interface Rider {
  readonly id: string
  /** Catalan with article, for announcements. */
  readonly name: string
  /** Neighbour preset id or crowd seed. */
  readonly neighbour: string
}

const TOWNSFOLK: readonly Rider[] = [
  { id: 'senyora-pilar', name: 'la Pilar', neighbour: 'senyora-pilar' },
  { id: 'la-nuria', name: 'la Núria', neighbour: 'la-nuria' },
  { id: 'en-pau', name: 'en Pau', neighbour: 'en-pau' },
  { id: 'la-fatima', name: 'la Fàtima', neighbour: 'la-fatima' },
  { id: 'l-avi-ramon', name: 'l’avi Ramon', neighbour: 'l-avi-ramon' },
  { id: 'en-kofi', name: 'en Kofi', neighbour: 'en-kofi' },
  { id: 'la-mei', name: 'la Mei', neighbour: 'la-mei' },
]

const CROWD_NAMES = ['una veïna', 'un veí', 'una passatgera', 'un passatger', 'una nena', 'un nen', 'una àvia', 'un senyor', 'una noia', 'un noi', 'una senyora', 'un avi', 'una mare']
const CROWD: readonly Rider[] = CROWD_NAMES.map((name, i) => ({ id: `pas-${i}`, name, neighbour: `bus-${i}` }))

/** Everybody who can ride: seven townspeople and thirteen faces from the crowd (the bus holds twenty). People are never lost, only moved. */
export const RIDERS: readonly Rider[] = [...TOWNSFOLK, ...CROWD]

export const RIDER_IDS: readonly string[] = RIDERS.map((r) => r.id)
/** Those who start the day sitting on the bus; one of them carries each bubble. */
export const REGULARS: readonly string[] = ['senyora-pilar', 'la-nuria', 'en-pau']

/** Seats of the bus, in the order people take them (see rooms). */
export const SEAT_IDS: readonly string[] = ['seient-1', 'seient-2', 'seient-3', 'seient-4', 'seient-5', 'seient-6']

/** Where people stand in the aisle when they are placed by the game (a gentle zig-zag). */
export function aisleSpot(i: number): Pt {
  return { x: 0.2 + ((i * 0.083) % 0.62), y: 0.78 + (i % 2) * 0.1 }
}

/** Where people wait at the stop (near the bench, in front of the kiosk). */
export function waitSpot(i: number): Pt {
  return { x: 0.12 + ((i * 0.09) % 0.46), y: 0.76 + (i % 2) * 0.1 }
}

export interface Placement {
  readonly id: string
  readonly room: string
  readonly at: Pt
}

/** Who is where: `roomOf` for every rider. */
export type RoomOf = (id: string) => string

/** At a new stop, between 2 and 4 people from «fora» come to wait (always the same for the same stop). */
export function arrivalsAt(stop: number, roomOf: RoomOf): Placement[] {
  const away = RIDER_IDS.filter((id) => roomOf(id) === AWAY_ROOM)
  const want = crowdAt(stop).length
  const start = Math.abs(stop * 5) % Math.max(1, away.length)
  const rotated = [...away.slice(start), ...away.slice(0, start)]
  return rotated.slice(0, want).map((id, i) => ({ id, room: STOP_ROOM, at: waitSpot(i) }))
}

/** When the bus leaves, those still at the stop go back «fora» (the child is never one of them: the bus waits for her). */
export function departures(roomOf: RoomOf, selected: string): Placement[] {
  return RIDER_IDS.filter((id) => roomOf(id) === STOP_ROOM && id !== selected).map((id) => ({ id, room: AWAY_ROOM, at: { x: 0.5, y: 0.8 } }))
}

/** Riders on the bus right now. */
export const onBoard = (roomOf: RoomOf): string[] => RIDER_IDS.filter((id) => roomOf(id) === BUS_ROOM)

/** The bus can leave: the driver sits at the wheel and the child is aboard. */
export const canLeave = (driverSeated: boolean, childRoom: string): boolean => driverSeated && childRoom === BUS_ROOM
