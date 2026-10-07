import { describe, expect, it } from 'vitest'
import { MISCONCEPTIONS } from '../../../core/ambit/types'
import { MISCONCEPTION_ADVICE, topMisconceptions } from './misconceptionAdvice'

describe('MISCONCEPTION_ADVICE', () => {
  it.each(MISCONCEPTIONS)('has a kind explanation and a concrete tip for %s', (id) => {
    const advice = MISCONCEPTION_ADVICE[id]
    expect(advice.title.length).toBeGreaterThan(3)
    expect(advice.explanation.length).toBeGreaterThan(20)
    expect(advice.tip.length).toBeGreaterThan(30)
  })

  it('covers exactly the enum', () => {
    expect(Object.keys(MISCONCEPTION_ADVICE).sort()).toEqual([...MISCONCEPTIONS].sort())
  })

  it('never blames the child', () => {
    const text = Object.values(MISCONCEPTION_ADVICE)
      .map((a) => `${a.explanation} ${a.tip}`)
      .join(' ')
    expect(text).not.toMatch(/\bmalament\b|\bvaga\b|\bdescuida|\bnegligent/i)
  })
})

describe('topMisconceptions', () => {
  it('is empty without data', () => {
    expect(topMisconceptions({})).toEqual([])
  })
  it('orders by count, keeps 5 and drops zeros', () => {
    const top = topMisconceptions({
      'off-by-one': 2,
      'no-carry': 9,
      'adjacent-fact': 5,
      'mult-as-add': 1,
      'div-as-sub': 3,
      'euro-cent-mix': 4,
      'one-step-only': 0,
    })
    expect(top.map((t) => t.id)).toEqual(['no-carry', 'adjacent-fact', 'euro-cent-mix', 'div-as-sub', 'off-by-one'])
    expect(top[0]?.count).toBe(9)
  })
})
