import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { quietStatus } from './quietStatus'

describe('quietStatus', () => {
  it('announces milestones only', () => {
    expect(quietStatus(0.4, 0.55, 0, 1)).toBe('Ja portes la meitat del camí!')
    expect(quietStatus(0.8, 0.9, 0, 1)).toBe('Gairebé hi som!')
    expect(quietStatus(0.1, 0.2, 4, 5)).toBe('Quin ritme! 5 respostes ràpides seguides.')
  })
  it('stays silent for ordinary answers', () => {
    expect(quietStatus(0.1, 0.2, 1, 2)).toBeUndefined()
    expect(quietStatus(0.6, 0.7, 6, 7)).toBeUndefined()
  })
  it('property: a run of small steps announces far fewer times than there are answers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 40 }), (n) => {
        const messages = Array.from({ length: n }, (_, i) => quietStatus(i / n, (i + 1) / n, i, i + 1)).filter(Boolean)
        expect(messages.length).toBeLessThanOrEqual(Math.ceil(n / 4) + 2)
      }),
    )
  })
})
