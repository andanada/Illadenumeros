import { describe, expect, it } from 'vitest'
import { nextCpaStage, softenedStage } from './cpa'

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

describe('softenedStage', () => {
  const bad = [true, false, false, true, false, false, true, false, false, true]
  const good = Array(10).fill(true)
  it('goes one stage more visual when accuracy over the last 10 is below 70 %', () => {
    expect(softenedStage('abstracte', bad)).toBe('pictoric')
    expect(softenedStage('pictoric', bad)).toBe('concret')
    expect(softenedStage('concret', bad)).toBe('concret')
  })
  it('keeps the stage when things go well or there is too little data', () => {
    expect(softenedStage('abstracte', good)).toBe('abstracte')
    expect(softenedStage('abstracte', [false, false, false])).toBe('abstracte')
    expect(softenedStage('abstracte', [...Array(3).fill(true), ...Array(7).fill(false)].slice(0, 10))).toBe('pictoric')
  })
  it('only looks at the last 10 answers', () => {
    expect(softenedStage('abstracte', [...Array(10).fill(false), ...good])).toBe('abstracte')
  })
})
