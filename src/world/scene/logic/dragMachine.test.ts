import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DRAG_THRESHOLD_PX, dragOffset, dragReducer, IDLE, type DragEvent, type DragState } from './dragMachine'

const down = (x = 0, y = 0, pointerId = 1): DragEvent => ({ type: 'down', propId: 'poma', pointerId, point: { x, y } })
const move = (x: number, y: number, pointerId = 1): DragEvent => ({ type: 'move', pointerId, point: { x, y } })
const up = (x: number, y: number, pointerId = 1): DragEvent => ({ type: 'up', pointerId, point: { x, y } })

const run = (events: DragEvent[]) =>
  events.reduce<{ state: DragState; effects: string[] }>(
    (acc, e) => {
      const step = dragReducer(acc.state, e)
      return { state: step.state, effects: step.effect ? [...acc.effects, step.effect.type] : acc.effects }
    },
    { state: IDLE, effects: [] },
  )

describe('dragReducer', () => {
  it('a still press is a tap', () => {
    expect(run([down(), move(3, 2), up(3, 2)]).effects).toEqual(['tap'])
  })

  it('moving past the threshold picks up and releases at the finger', () => {
    const step = dragReducer(dragReducer(dragReducer(IDLE, down()).state, move(40, 0)).state, up(50, 10))
    expect(step.effect).toEqual({ type: 'release', propId: 'poma', point: { x: 50, y: 10 } })
    expect(step.state).toEqual(IDLE)
    expect(run([down(), move(40, 0), move(60, 0), up(60, 0)]).effects).toEqual(['pickup', 'release'])
  })

  it('tracks the drag offset', () => {
    const s = run([down(10, 10), move(40, 30)]).state
    expect(dragOffset(s)).toEqual({ x: 30, y: 20 })
    expect(dragOffset(IDLE)).toEqual({ x: 0, y: 0 })
  })

  it('ignores other pointers and a second finger', () => {
    const pressed = dragReducer(IDLE, down()).state
    expect(dragReducer(pressed, down(0, 0, 2)).state).toBe(pressed)
    expect(dragReducer(pressed, move(100, 0, 2)).state).toBe(pressed)
    expect(dragReducer(pressed, up(0, 0, 2)).effect).toBeUndefined()
    expect(dragReducer(IDLE, move(1, 1)).state).toBe(IDLE)
    expect(dragReducer(IDLE, up(1, 1)).effect).toBeUndefined()
    expect(dragReducer(IDLE, { type: 'cancel', pointerId: 1 }).effect).toBeUndefined()
  })

  it('cancel aborts a drag but not a press', () => {
    expect(run([down(), move(50, 0), { type: 'cancel', pointerId: 1 }]).effects).toEqual(['pickup', 'abort'])
    expect(run([down(), { type: 'cancel', pointerId: 1 }]).effects).toEqual([])
  })

  it('property: any gesture ends idle with exactly one of tap / release / abort', () => {
    const point = fc.record({ x: fc.integer({ min: -500, max: 500 }), y: fc.integer({ min: -500, max: 500 }) })
    fc.assert(
      fc.property(fc.array(point, { maxLength: 12 }), point, fc.boolean(), (moves, end, cancel) => {
        const events: DragEvent[] = [down(), ...moves.map((p) => move(p.x, p.y)), cancel ? { type: 'cancel', pointerId: 1 } : up(end.x, end.y)]
        const { state, effects } = run(events)
        expect(state).toEqual(IDLE)
        const finals = effects.filter((e) => e !== 'pickup')
        expect(finals.length).toBeLessThanOrEqual(1)
        const moved = moves.some((p) => Math.hypot(p.x, p.y) >= DRAG_THRESHOLD_PX)
        expect(effects.includes('pickup')).toBe(moved)
        if (!cancel) expect(finals).toEqual([moved ? 'release' : 'tap'])
      }),
    )
  })
})
