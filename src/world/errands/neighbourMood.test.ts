import { describe, expect, it } from 'vitest'
import { neighbourPose, queueOf } from './neighbourMood'

describe('neighbourPose', () => {
  it('waves while walking in, cheers when served, holds out a hand for price tags', () => {
    expect(neighbourPose({ phase: 'asking', arriving: true, handOut: false })).toBe('wave')
    expect(neighbourPose({ phase: 'asking', arriving: false, handOut: false })).toBe('idle')
    expect(neighbourPose({ phase: 'asking', arriving: false, handOut: true })).toBe('hold')
    expect(neighbourPose({ phase: 'checking', arriving: false, handOut: true })).toBe('hold')
    expect(neighbourPose({ phase: 'thanks', arriving: false, handOut: true })).toBe('cheer')
    expect(neighbourPose({ phase: 'thanks', arriving: true, handOut: false })).toBe('cheer')
    expect(neighbourPose({ phase: 'shown', arriving: false, handOut: false })).toBe('idle')
  })
})

describe('queueOf', () => {
  it('the one at the counter is not in the queue; at most 3 wait at the door, the rest is a number', () => {
    expect(queueOf(3, true, 0)).toEqual({ waiting: 2, shown: [1, 2], more: 0 })
    expect(queueOf(3, false, 0)).toEqual({ waiting: 3, shown: [0, 1, 2], more: 0 })
    expect(queueOf(6, true, 4).shown).toEqual([5, 6, 7])
    expect(queueOf(6, true, 4).more).toBe(2)
    expect(queueOf(0, true, 0)).toEqual({ waiting: 0, shown: [], more: 0 })
    expect(queueOf(1, true, 0).waiting).toBe(0)
  })
})
