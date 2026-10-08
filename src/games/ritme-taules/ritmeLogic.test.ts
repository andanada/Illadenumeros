import fc from 'fast-check'
import { barBeats, isStrongBeat, preCounted, ritmeTexts, tapeEntries, tapsRequired, weakBeatMessage } from './ritmeLogic'

describe('ritmeLogic', () => {
  it('asks for fewer taps as the level rises', () => {
    expect(tapsRequired(7, 1)).toBe(7)
    expect(tapsRequired(7, 2)).toBe(3)
    expect(tapsRequired(2, 2)).toBe(2)
    expect(tapsRequired(7, 3)).toBe(0)
  })
  it('pre-counts the multiples the child does not tap', () => {
    expect(preCounted(4, 5, 3)).toEqual([4, 8])
    expect(preCounted(4, 5, 5)).toEqual([])
  })
  it('every bar has exactly one strong beat: its last', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 0, max: 9 }), (size, bar) => {
        const beats = barBeats(size, bar)
        expect(beats).toHaveLength(size)
        expect(beats.filter((b) => isStrongBeat(b, size))).toEqual([size * (bar + 1)])
      }),
    )
  })
  it('hides only the last entry of the tape', () => {
    expect(tapeEntries(3, 3, 3, true)).toEqual(['3', '6', '?'])
    expect(tapeEntries(3, 2, 3, true)).toEqual(['3', '6'])
    expect(tapeEntries(3, 3, 3, false)).toEqual(['3', '6', '9'])
  })
  it('words the question for both operations', () => {
    expect(ritmeTexts('mul', 4, 3, 12).question).toBe('Quin número cau al compàs 3?')
    expect(ritmeTexts('div', 4, 3, 12).question).toBe('Quants compassos de 4 hi ha fins al 12?')
  })
  it('nudges kindly on weak beats', () => {
    expect(weakBeatMessage(5, 4)).toBe('El 5 és un batec suau. El batec fort és el 8.')
    expect(weakBeatMessage(5, 4)).not.toMatch(/error|malament/i)
  })
})
