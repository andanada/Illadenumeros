import { starsForSummary } from './summaryStars'

describe('starsForSummary', () => {
  it('always gives at least one star', () => {
    expect(starsForSummary({ answered: 0, correct: 0 })).toBe(1)
    expect(starsForSummary({ answered: 10, correct: 1 })).toBe(1)
  })
  it('scales with accuracy', () => {
    expect(starsForSummary({ answered: 10, correct: 6 })).toBe(2)
    expect(starsForSummary({ answered: 10, correct: 9 })).toBe(3)
  })
})
