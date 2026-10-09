import { describe, expect, it } from 'vitest'
import { noteAt, STEP_MS } from './arcadeSfx'

describe('arcade music', () => {
  it('is a pentatonic-ish loop that repeats every 16 steps and never leaves the scale', () => {
    expect(noteAt(0)).toBe(noteAt(16))
    expect(noteAt(5)).toBe(noteAt(21))
    for (let i = -20; i < 40; i++) {
      const f = noteAt(i)
      expect(f).toBeGreaterThanOrEqual(262)
      expect(f).toBeLessThanOrEqual(587)
    }
    expect(STEP_MS).toBeGreaterThan(100)
  })
})
