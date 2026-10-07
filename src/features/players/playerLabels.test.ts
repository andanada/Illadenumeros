import { describe, expect, it } from 'vitest'
import { lastPlayedLabel, playerLabel } from './playerLabels'

describe('playerLabel', () => {
  it('adds the character only when asked (same-name players)', () => {
    expect(playerLabel({ name: 'Laia', character: 'mixa' }, false)).toBe('Laia')
    expect(playerLabel({ name: 'Laia', character: 'mixa' }, true)).toBe('Laia (Mixa)')
  })
})

describe('lastPlayedLabel', () => {
  const now = new Date(2026, 9, 7, 18, 0).getTime()
  it('says today, yesterday or the date', () => {
    expect(lastPlayedLabel(new Date(2026, 9, 7, 8, 0).getTime(), now)).toBe('Darrer cop: avui')
    expect(lastPlayedLabel(new Date(2026, 9, 6, 23, 0).getTime(), now)).toBe('Darrer cop: ahir')
    expect(lastPlayedLabel(new Date(2026, 8, 1, 12, 0).getTime(), now)).toMatch(/^Darrer cop: 1 .*setembre$/)
  })
})
