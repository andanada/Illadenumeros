import { describe, expect, it } from 'vitest'
import { SURPRISE_START, surpriseProgress, surpriseResult, tapSurprise, type SurpriseDef } from './surprise'

const DEF: SurpriseDef = { seed: 'ou-1', taps: 3, options: ['pollet', 'moneda', 'estrella', 'gat'] }

describe('surprise', () => {
  it('reveals on the nth tap, always the same thing for a seed', () => {
    let s = SURPRISE_START
    s = tapSurprise(DEF, s)
    s = tapSurprise(DEF, s)
    expect(s.revealed).toBeUndefined()
    expect(surpriseProgress(DEF, s)).toBeCloseTo(2 / 3)
    s = tapSurprise(DEF, s)
    expect(s.revealed).toBe(surpriseResult(DEF))
    expect(tapSurprise(DEF, s)).toBe(s)
    expect(surpriseResult({ ...DEF })).toBe(surpriseResult(DEF))
  })

  it('different seeds can give different things', () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => surpriseResult({ ...DEF, seed: `s${i}` })))
    expect(seen.size).toBeGreaterThan(1)
  })
})
