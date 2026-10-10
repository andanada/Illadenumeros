import { describe, expect, it } from 'vitest'
import { dropSpot } from './dropSpot'
import { decode, encodeX } from './zones'

const rect = { left: 100, top: 0, width: 400, height: 200 }
const base = { zone: 'bany' as const, rect, now: 1000, count: 0, wall: false }
const mark = (x: number, y: number, at = 990) => ({ x, y, at })

describe('dropSpot', () => {
  it('a new piece stands where the finger lifted, feet a little lower', () => {
    const r = dropSpot({ ...base, track: { down: mark(300, 100), last: mark(300, 100) } })
    const s = decode({ uid: 'h1', ...r })
    expect(s.zone).toBe('bany')
    expect(s.x).toBeCloseTo(0.5, 2)
    expect(s.y).toBeCloseTo(0.56, 2)
  })

  it('dragging inside the zone moves by the travel of the finger', () => {
    const moving = { uid: 'h1', x: encodeX('bany', 0.5), y: 0.8 }
    const r = dropSpot({ ...base, moving, track: { down: mark(300, 100), last: mark(380, 100) } })
    expect(decode({ uid: 'h1', ...r }).x).toBeCloseTo(0.7, 2)
    expect(r.y).toBeCloseTo(0.8, 2)
  })

  it('keyboard drops (no fresh position) keep the piece or pick a free spot', () => {
    const moving = { uid: 'h1', x: encodeX('bany', 0.5), y: 0.8 }
    expect(dropSpot({ ...base, moving, track: { down: undefined, last: undefined } })).toEqual({ x: moving.x, y: moving.y })
    const fresh = dropSpot({ ...base, track: { down: undefined, last: mark(300, 100, 0) } })
    expect(decode({ uid: 'h1', ...fresh }).zone).toBe('bany')
  })

  it('a piece taken to another zone lands at the finger, not by travel', () => {
    const moving = { uid: 'h1', x: encodeX('sala', 0.5), y: 0.8 }
    const r = dropSpot({ ...base, moving, track: { down: mark(900, 100), last: mark(200, 150) } })
    const s = decode({ uid: 'h1', ...r })
    expect(s.zone).toBe('bany')
    expect(s.x).toBeCloseTo(0.25, 2)
  })
})
