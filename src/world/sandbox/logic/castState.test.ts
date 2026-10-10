import { describe, expect, it } from 'vitest'
import { spawn } from './actorMachine'
import { anyWalking, castReducer, makeCast } from './castState'

const base = makeCast({ laia: spawn({ x: 0.2, y: 0.8 }), pilar: spawn({ x: 0.7, y: 0.8 }) }, 'laia')

describe('castState', () => {
  it('selecting switches the controlled actor and clears a pending social', () => {
    const pending = castReducer(base, { type: 'social', kind: 'abraca' })
    const s = castReducer(pending, { type: 'select', id: 'pilar' })
    expect(s.selected).toBe('pilar')
    expect(s.social).toBeUndefined()
    expect(castReducer(base, { type: 'select', id: 'nobody' })).toBe(base)
  })

  it('only the actor that got the event changes', () => {
    const s = castReducer(base, { type: 'actor', id: 'laia', event: { type: 'walk', path: [{ x: 0.5, y: 0.8 }] } })
    expect(s.actors.laia?.mode).toBe('walking')
    expect(s.actors.pilar).toBe(base.actors.pilar)
    expect(anyWalking(s)).toBe(true)
  })

  it('ticks only touch walkers and return the same state when nobody moves', () => {
    expect(castReducer(base, { type: 'tick', dtMs: 16 })).toBe(base)
    const walking = castReducer(base, { type: 'actor', id: 'laia', event: { type: 'walk', path: [{ x: 0.5, y: 0.8 }] } })
    const later = castReducer(walking, { type: 'tick', dtMs: 4000 })
    expect(later.actors.laia?.mode).toBe('idle')
    expect(later.actors.laia?.at).toEqual({ x: 0.5, y: 0.8 })
  })
})
