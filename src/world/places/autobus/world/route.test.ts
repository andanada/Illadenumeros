import { describe, expect, it } from 'vitest'
import type { SeatsTask } from '../errands/seatsLogic'
import { RIDER_IDS } from './riders'
import { pedalAllowed, seatsInWorld, seatsSetup, stopAfter, tripMs } from './route'

const task = (start: number, waiting: number): SeatsTask => ({ mode: 'on', a: start, b: waiting, start, waiting })

describe('route', () => {
  it('moves along the line and stops at its ends', () => {
    expect(stopAfter(5, 1)).toBe(6)
    expect(stopAfter(5, -10)).toBe(0)
    expect(stopAfter(198, 10)).toBe(199)
    expect(pedalAllowed(0, -1)).toBe(false)
    expect(pedalAllowed(0, 10)).toBe(true)
  })

  it('trips are instant with reduced motion and longer for tens', () => {
    expect(tripMs(1, true)).toBe(0)
    expect(tripMs(10, false)).toBeGreaterThan(tripMs(1, false))
  })

  it('plays the seats task with people only when everybody fits', () => {
    expect(seatsInWorld(task(8, 5))).toBe(true)
    expect(seatsInWorld(task(18, 4))).toBe(false)
  })

  it('sets the stage: start aboard (the carrier first), waiting at the stop, nobody lost', () => {
    const plan = seatsSetup(task(8, 5), 'la-nuria')
    expect(plan).toHaveLength(RIDER_IDS.length)
    expect(plan.filter((p) => p.room === 'bus')).toHaveLength(8)
    expect(plan.filter((p) => p.room === 'parada')).toHaveLength(5)
    expect(plan.find((p) => p.id === 'la-nuria')?.room).toBe('bus')
    expect(new Set(plan.map((p) => p.id)).size).toBe(RIDER_IDS.length)
  })
})

describe('stopsAround', () => {
  it('shows eleven stops around the bus and never leaves the line', async () => {
    const { stopsAround } = await import('./route')
    expect(stopsAround(1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(stopsAround(50)).toHaveLength(11)
    expect(stopsAround(50)).toContain(50)
    expect(Math.max(...stopsAround(199))).toBe(199)
  })
})
