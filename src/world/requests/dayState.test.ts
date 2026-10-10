import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BoardTask } from '../board/boardPlan'
import type { SceneId } from '../model/types'
import { isQuiet, isQuotaDone, jarLevel, minutesLeft, newDayState, recordResolved, REQUEST_SECONDS, waitingAt } from './dayState'
import type { Request } from './types'

const TASKS: readonly BoardTask[] = [
  { place: 'recreatius', count: 1, kind: 'calentament', neighbour: 'en-kofi' },
  { place: 'botiga', count: 2, kind: 'repte', neighbour: 'senyora-pilar' },
]
const req = (id: string, expiresSoft: number): Request => ({ id, placeId: 'botiga', kind: 'serve', actorId: 'senyora-pilar', createdAt: 0, expiresSoft })

describe('day state', () => {
  it('a solved request leaves the live list (waiting first), fills the jar and stays immutable', () => {
    const start = Object.freeze({ ...newDayState('2026-10-09', TASKS), live: [req('calm', 10), req('wait', 1000)] })
    const next = recordResolved(start, 'botiga', true, 500)
    expect(next.live.map((r) => r.id)).toEqual(['calm'])
    expect(next.seconds).toBe(REQUEST_SECONDS)
    expect(start.live).toHaveLength(2)
    expect(next.lastSolvedAt.botiga).toBe(500)
    expect(waitingAt(next, 'botiga', 500)).toHaveLength(0)
  })

  it('extra requests beyond the allotment give coins only: the jar does not move', () => {
    let s = newDayState('2026-10-09', TASKS)
    for (let i = 0; i < 3; i++) s = recordResolved(s, 'botiga', true, i)
    expect(s.seconds).toBe(2 * REQUEST_SECONDS)
  })

  it('finishing the allotment completes the quota, and the jar is full at the target', () => {
    let s = newDayState('2026-10-09', TASKS)
    for (const p of ['recreatius', 'botiga', 'botiga'] as const) s = recordResolved(s, p, true, 1)
    expect(isQuotaDone(s)).toBe(true)
    expect(jarLevel(s)).toBe(1)
    expect(minutesLeft(s)).toBe(0)
    const start = newDayState('2026-10-09', TASKS)
    expect(jarLevel(start)).toBe(0)
    expect(jarLevel(recordResolved(start, 'botiga', true, 1))).toBeCloseTo(1 / 3)
    expect(minutesLeft(start)).toBe(Math.ceil((3 * REQUEST_SECONDS) / 60))
    expect(jarLevel({ ...start, board: { ...start.board, tasks: [] } })).toBe(0)
  })

  it('quiet mode needs 5 answers and under 70 % clean in the last 10', () => {
    let s = newDayState('2026-10-09', TASKS)
    for (let i = 0; i < 4; i++) s = recordResolved(s, 'botiga', false, i)
    expect(isQuiet(s)).toBe(false)
    s = recordResolved(s, 'botiga', false, 5)
    expect(isQuiet(s)).toBe(true)
    for (let i = 0; i < 10; i++) s = recordResolved(s, 'botiga', true, 9 + i)
    expect(s.recent).toHaveLength(10)
    expect(isQuiet(s)).toBe(false)
  })

  it('migrates a day already played on the old board: the jar starts from its done count', () => {
    const board = { ...newDayState('2026-10-09', TASKS).board, done: { botiga: 2 } }
    expect(newDayState('2026-10-09', TASKS, board).seconds).toBe(2 * REQUEST_SECONDS)
  })

  it('property: the jar never exceeds the allotment and never decreases', () => {
    const place = fc.constantFrom<SceneId>('botiga', 'recreatius', 'casa')
    fc.assert(
      fc.property(fc.array(place, { maxLength: 20 }), (places) => {
        let s = newDayState('2026-10-09', TASKS)
        for (const p of places) {
          const next = recordResolved(s, p, true, 1)
          expect(next.seconds).toBeGreaterThanOrEqual(s.seconds)
          s = next
        }
        expect(s.seconds).toBeLessThanOrEqual(3 * REQUEST_SECONDS)
      }),
    )
  })
})
