import { describe, expect, it } from 'vitest'
import { parseAttempts } from './attemptSchema'
import { att, NOW } from './analytics/testData'

describe('parseAttempts', () => {
  it('keeps valid rows and skips damaged ones', () => {
    const good = att(NOW)
    expect(parseAttempts([good, { id: 3 }, null, 'x'])).toHaveLength(1)
  })
  it('drops an unknown misconception but keeps the attempt', () => {
    const [parsed] = parseAttempts([{ ...att(NOW), misconception: 'from-the-future' }])
    expect(parsed).toBeDefined()
    expect(parsed?.misconception).toBeUndefined()
  })
  it('accepts an empty list', () => {
    expect(parseAttempts([])).toEqual([])
  })
})
