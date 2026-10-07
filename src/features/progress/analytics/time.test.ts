import { describe, expect, it } from 'vitest'
import { dayIndex, dayKey, daysBetween, startOfDay } from './time'

describe('time helpers', () => {
  it('formats local day keys like the store (YYYY-MM-DD)', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
  })
  it('computes calendar days between timestamps', () => {
    const a = new Date(2026, 9, 7, 1).getTime()
    const b = new Date(2026, 9, 5, 23).getTime()
    expect(daysBetween(b, a)).toBe(2)
    expect(daysBetween(a, a)).toBe(0)
    expect(daysBetween(a, b)).toBe(-2)
  })
  it('survives the daylight saving change', () => {
    const before = new Date(2026, 2, 28, 12).getTime()
    const after = new Date(2026, 2, 30, 12).getTime()
    expect(daysBetween(before, after)).toBe(2)
  })
  it('gives the same index for the same day', () => {
    expect(dayIndex(new Date(2026, 9, 7, 3).getTime())).toBe(dayIndex(new Date(2026, 9, 7, 22).getTime()))
    expect(startOfDay(new Date(2026, 9, 7, 22).getTime())).toBe(new Date(2026, 9, 7).getTime())
  })
})
