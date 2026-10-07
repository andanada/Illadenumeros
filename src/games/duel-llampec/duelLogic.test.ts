import { describe, expect, it } from 'vitest'
import { duelSkills, pickRival, pointsFor, rivalProgress } from './duelLogic'

describe('duelSkills', () => {
  it('intersects with the fact skills', () => {
    expect(duelSkills(['A5', 'B1', 'A9'])).toEqual(['A5', 'A9'])
  })
  it('falls back to A4', () => {
    expect(duelSkills(['B1'])).toEqual(['A4'])
  })
  it('allows all when unrestricted', () => {
    expect(duelSkills(undefined)).toHaveLength(6)
  })
})

describe('pointsFor', () => {
  it('gives full points to fast answers and half to slow ones', () => {
    expect(pointsFor(4000, 3000)).toBe(1)
    expect(pointsFor(9000, 3000)).toBe(0.5)
  })
})

describe('rivalProgress', () => {
  it('stays below the finish line', () => {
    expect(rivalProgress(1e9, 1)).toBeLessThanOrEqual(0.92)
  })
})

describe('pickRival', () => {
  it('never picks the child character', () => {
    for (let i = 0; i < 20; i++) expect(pickRival('mixa', i)).not.toBe('mixa')
  })
})
