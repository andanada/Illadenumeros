import { describe, expect, it } from 'vitest'
import { nextCpaStage } from './cpa'

describe('cpa', () => {
  it('moves up after 8 correct out of the last 10', () => {
    const recent = [true, true, true, false, true, true, true, true, false, true]
    expect(nextCpaStage('concret', recent, 0)).toBe('pictoric')
    expect(nextCpaStage('pictoric', recent, 0)).toBe('abstracte')
  })

  it('does not move up with fewer than 10 answers', () => {
    expect(nextCpaStage('concret', [true, true, true], 0)).toBe('concret')
  })

  it('stays at abstract at the top', () => {
    expect(nextCpaStage('abstracte', Array(10).fill(true), 0)).toBe('abstracte')
  })

  it('moves down after two consecutive errors', () => {
    expect(nextCpaStage('abstracte', [true, false, false], 2)).toBe('pictoric')
    expect(nextCpaStage('concret', [false, false], 2)).toBe('concret')
  })
})
