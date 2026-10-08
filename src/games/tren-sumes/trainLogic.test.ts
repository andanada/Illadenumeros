import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { MIN_ROUNDS, TRIP_STEPS, roundCap, steamLevel, stepFor, tripEnded, tripProgress } from './trainLogic'

describe('stepFor', () => {
  it('always moves the train forward, faster answers move it more', () => {
    expect(stepFor('fast', true)).toBe(1)
    expect(stepFor('steady', true)).toBeGreaterThan(stepFor('calm', true))
    expect(stepFor('calm', true)).toBeGreaterThan(stepFor('calm', false))
    expect(stepFor('calm', false)).toBeGreaterThan(0)
  })
})

describe('tripProgress and steamLevel', () => {
  it('stay within 0..1', () => {
    fc.assert(
      fc.property(fc.double({ min: -5, max: 100, noNaN: true }), (n) => {
        expect(tripProgress(n)).toBeGreaterThanOrEqual(0)
        expect(tripProgress(n)).toBeLessThanOrEqual(1)
        expect(steamLevel(n)).toBeGreaterThanOrEqual(0)
        expect(steamLevel(n)).toBeLessThanOrEqual(1)
      }),
    )
  })
  it('fills the steam after four fast answers', () => {
    expect(steamLevel(2)).toBe(0.5)
    expect(steamLevel(4)).toBe(1)
  })
})

describe('tripEnded', () => {
  it('arrives at the station after the minimum number of questions', () => {
    expect(tripEnded(TRIP_STEPS, MIN_ROUNDS, undefined)).toBe(true)
    expect(tripEnded(TRIP_STEPS, MIN_ROUNDS - 1, undefined)).toBe(false)
    expect(tripEnded(5, 10, undefined)).toBe(false)
  })
  it('a host limit shortens the trip but never below the minimum', () => {
    expect(roundCap(3)).toBe(MIN_ROUNDS)
    expect(roundCap(20)).toBe(20)
    expect(tripEnded(2, MIN_ROUNDS, 3)).toBe(true)
    expect(tripEnded(2, MIN_ROUNDS - 1, 3)).toBe(false)
  })
  it('property: the slowest possible answers still reach the station', () => {
    const slowest = stepFor('calm', false)
    const needed = Math.ceil(TRIP_STEPS / slowest)
    expect(tripEnded(needed * slowest, needed, undefined)).toBe(true)
  })
})
