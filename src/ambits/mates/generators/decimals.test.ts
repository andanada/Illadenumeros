import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { formatDecimal, parseDecimal, speakDecimal } from './decimals'

describe('decimal helpers', () => {
  it('formats with a comma and trims useless zeros', () => {
    expect(formatDecimal(350)).toBe('3,5')
    expect(formatDecimal(305)).toBe('3,05')
    expect(formatDecimal(300)).toBe('3')
    expect(formatDecimal(5)).toBe('0,05')
    expect(formatDecimal(350, true)).toBe('3,50')
    expect(formatDecimal(300, true)).toBe('3,00')
  })
  it('round-trips', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 99999 }), (h) => parseDecimal(formatDecimal(h)) === h))
  })
  it('rejects non decimals', () => {
    expect(parseDecimal('3.5')).toBeUndefined()
    expect(parseDecimal('a')).toBeUndefined()
  })
  it('speaks the comma', () => {
    expect(speakDecimal(350)).toBe('3 coma 5')
    expect(speakDecimal(305)).toBe('3 coma zero 5')
  })
})
