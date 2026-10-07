import { describe, expect, it } from 'vitest'
import { formatDuration, formatPercent, shortDay } from './format'

describe('formatDuration', () => {
  it('handles zero, minutes and hours', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(0.4)).toBe('menys d’1 min')
    expect(formatDuration(45.4)).toBe('45 min')
    expect(formatDuration(125)).toBe('2 h 05 min')
    expect(formatDuration(120)).toBe('2 h')
  })
  it('never prints NaN', () => {
    expect(formatDuration(Number.NaN)).toBe('0 min')
    expect(formatDuration(-4)).toBe('0 min')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0 min')
  })
})

describe('formatPercent', () => {
  it('rounds and uses a spaced percent sign', () => {
    expect(formatPercent(0.824)).toBe('82 %')
    expect(formatPercent(1)).toBe('100 %')
  })
  it('shows a dash without data', () => {
    expect(formatPercent(undefined)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
  })
})

describe('shortDay', () => {
  it('formats YYYY-MM-DD as day and month', () => {
    expect(shortDay('2026-10-07')).toBe('7/10')
    expect(shortDay('garbage')).toBe('garbage')
  })
})
