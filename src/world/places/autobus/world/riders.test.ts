import { describe, expect, it } from 'vitest'
import { AWAY_ROOM, BUS_ROOM, REGULARS, RIDERS, RIDER_IDS, STOP_ROOM, arrivalsAt, canLeave, departures, onBoard } from './riders'

describe('riders', () => {
  it('has twenty distinct riders and the regulars are among them', () => {
    expect(new Set(RIDER_IDS).size).toBe(20)
    for (const id of REGULARS) expect(RIDER_IDS).toContain(id)
    expect(RIDERS.every((r) => r.name.length > 0)).toBe(true)
  })

  it('brings 2 to 4 people from «fora» to a stop, always the same ones for the same stop', () => {
    const roomOf = (id: string): string => (REGULARS.includes(id) ? BUS_ROOM : AWAY_ROOM)
    for (let stop = 0; stop < 12; stop++) {
      const a = arrivalsAt(stop, roomOf)
      expect(a.length).toBeGreaterThanOrEqual(2)
      expect(a.length).toBeLessThanOrEqual(4)
      expect(a.every((p) => p.room === STOP_ROOM && roomOf(p.id) === AWAY_ROOM)).toBe(true)
      expect(arrivalsAt(stop, roomOf)).toEqual(a)
    }
  })

  it('on departure everybody at the stop goes away except the selected child', () => {
    const roomOf = (id: string): string => (id === 'la-mei' || id === 'laia' ? STOP_ROOM : BUS_ROOM)
    expect(departures(roomOf, 'laia').map((p) => p.id)).toEqual(['la-mei'])
    expect(departures(roomOf, 'la-mei')).toEqual([])
  })

  it('counts who is aboard and only lets the bus leave with a driver and the child aboard', () => {
    expect(onBoard((id) => (id === 'en-pau' ? BUS_ROOM : AWAY_ROOM))).toEqual(['en-pau'])
    expect(canLeave(true, BUS_ROOM)).toBe(true)
    expect(canLeave(false, BUS_ROOM)).toBe(false)
    expect(canLeave(true, STOP_ROOM)).toBe(false)
  })
})
