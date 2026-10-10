import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { actorReducer, advance, dist, poseOf, spawn } from './actorMachine'

const start = spawn({ x: 0.2, y: 0.8 })

describe('actorMachine', () => {
  it('walk sets the mode and turns toward the first waypoint', () => {
    const s = actorReducer(start, { type: 'walk', path: [{ x: 0.1, y: 0.8 }] })
    expect(s.mode).toBe('walking')
    expect(s.facing).toBe(-1)
  })

  it('an empty path leaves an idle actor idle', () => {
    expect(actorReducer(start, { type: 'walk', path: [] })).toBe(start)
  })

  it('walking stands the actor up and arriving ends the walk', () => {
    const sat = actorReducer(start, { type: 'sit', seat: 'sofa', at: { x: 0.5, y: 0.7 } })
    expect(sat.mode).toBe('sitting')
    const walking = actorReducer(sat, { type: 'walk', path: [{ x: 0.6, y: 0.7 }] })
    expect(walking.seat).toBeUndefined()
    const done = advance(walking, 5000)
    expect(done.mode).toBe('idle')
    expect(done.at).toEqual({ x: 0.6, y: 0.7 })
  })

  it('stand only affects a sitting actor', () => {
    expect(actorReducer(start, { type: 'stand' })).toBe(start)
    const sat = actorReducer(start, { type: 'sit', seat: 'sofa', at: { x: 0.5, y: 0.7 } })
    expect(actorReducer(sat, { type: 'stand' }).mode).toBe('idle')
  })

  it('carrying survives walking, sitting and emoting', () => {
    let s = actorReducer(start, { type: 'pickup', item: 'poma' })
    expect(poseOf(s)).toBe('hold')
    s = actorReducer(s, { type: 'walk', path: [{ x: 0.5, y: 0.8 }] })
    expect(s.carrying).toBe('poma')
    s = advance(s, 5000)
    s = actorReducer(s, { type: 'emote', kind: 'cor' })
    expect(s.carrying).toBe('poma')
    expect(actorReducer(s, { type: 'drop' }).carrying).toBeUndefined()
  })

  it('emotes pick a pose, are ignored while walking, and a seated actor stays seated', () => {
    expect(poseOf(actorReducer(start, { type: 'emote', kind: 'salut' }))).toBe('wave')
    expect(poseOf(actorReducer(start, { type: 'emote', kind: 'uau' }))).toBe('cheer')
    const walking = actorReducer(start, { type: 'walk', path: [{ x: 0.9, y: 0.8 }] })
    expect(actorReducer(walking, { type: 'emote', kind: 'cor' })).toBe(walking)
    const sat = actorReducer(start, { type: 'sit', seat: 's', at: start.at })
    const happy = actorReducer(sat, { type: 'emote', kind: 'riure' })
    expect(happy.mode).toBe('sitting')
    expect(actorReducer(actorReducer(start, { type: 'emote', kind: 'cor' }), { type: 'emoteEnd' }).mode).toBe('idle')
  })

  it('crossing a door changes room, stops the walk and keeps the carried item', () => {
    const holding = actorReducer(actorReducer(start, { type: 'pickup', item: 'poma' }), { type: 'walk', path: [{ x: 0.9, y: 0.8 }] })
    const inside = actorReducer(holding, { type: 'enter', room: 'jardi', at: { x: 0.1, y: 0.8 } })
    expect(inside).toMatchObject({ mode: 'idle', room: 'jardi', carrying: 'poma', path: [] })
  })

  it('property: advancing never overshoots the destination nor teleports farther than the budget', () => {
    const pt = fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0, max: 1, noNaN: true }) })
    fc.assert(
      fc.property(pt, fc.array(pt, { minLength: 1, maxLength: 5 }), fc.integer({ min: 1, max: 400 }), (from, path, dt) => {
        const walking = actorReducer(spawn(from), { type: 'walk', path })
        const after = advance(walking, dt)
        expect(dist(from, after.at)).toBeLessThanOrEqual((0.32 * dt) / 1000 + 1e-9)
        for (const p of [after.at]) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(1)
        }
      }),
    )
  })
})
