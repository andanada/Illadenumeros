import { describe, expect, it } from 'vitest'
import { dist } from './actorMachine'
import { followSpot, meetingSpot, socialEmotes, TOGETHER } from './social'

describe('social', () => {
  it('hugs give hearts back, high fives are mutual', () => {
    expect(socialEmotes('abraca')).toEqual({ actor: 'abraca', other: 'cor' })
    expect(socialEmotes('xoca')).toEqual({ actor: 'xoca', other: 'xoca' })
  })

  it('you stop beside the other, on your own side', () => {
    const spot = meetingSpot({ x: 0.1, y: 0.8 }, { x: 0.5, y: 0.7 })
    expect(spot.x).toBeLessThan(0.5)
    expect(dist(spot, { x: 0.5, y: 0.7 })).toBeLessThanOrEqual(TOGETHER)
  })

  it('a pet stays put while close and trots over when the leader leaves', () => {
    expect(followSpot({ x: 0.5, y: 0.8 }, { x: 0.55, y: 0.8 })).toBeUndefined()
    const spot = followSpot({ x: 0.1, y: 0.8 }, { x: 0.7, y: 0.8 })
    expect(spot).toBeDefined()
    expect(spot && spot.x).toBeLessThan(0.7)
  })
})
