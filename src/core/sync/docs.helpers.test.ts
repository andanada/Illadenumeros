import { describe, expect, it } from 'vitest'
import { attemptQuarantineId, docQuarantineId, normalizeRewards } from './docs'

describe('normalizeRewards', () => {
  it('sorts and dedupes the lists like the server union (new object)', () => {
    const input = { id: 'me' as const, petals: 3, stickers: ['sol', 'drac', 'sol'], daysPlayed: ['2026-01-02', '2026-01-01'], missionsDone: [] }
    expect(normalizeRewards(input)).toEqual({ id: 'me', petals: 3, stickers: ['drac', 'sol'], daysPlayed: ['2026-01-01', '2026-01-02'], missionsDone: [] })
    expect(input.stickers).toEqual(['sol', 'drac', 'sol'])
  })
})

describe('quarantine ids', () => {
  it('skill/fact use the version time; rewards/settings a hash of the content', () => {
    expect(docQuarantineId({ kind: 'skill', key: 'A1', data: {}, updatedAt: 5 })).toBe('skill:A1@5')
    const a = docQuarantineId({ kind: 'rewards', key: 'me', data: { petals: 1 }, updatedAt: 5 })
    expect(docQuarantineId({ kind: 'rewards', key: 'me', data: { petals: 1 }, updatedAt: 9 })).toBe(a)
    expect(docQuarantineId({ kind: 'rewards', key: 'me', data: { petals: 2 }, updatedAt: 5 })).not.toBe(a)
    expect(attemptQuarantineId('abc')).toBe('attempt:abc')
  })
})
