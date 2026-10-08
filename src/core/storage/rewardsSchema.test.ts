import { describe, expect, it } from 'vitest'
import { emptyRewards, rewardsSchema } from './db'

describe('rewards schema (migration-safe)', () => {
  it('reads a row saved before the house and the daily challenge existed', () => {
    const legacy = { id: 'me', petals: 12, stickers: ['sol'], daysPlayed: ['2026-09-01'], missionsDone: [] }
    expect(rewardsSchema.parse(legacy)).toEqual({ ...legacy, decorOwned: [], decorPlaced: [], dailyDone: [] })
  })

  it('keeps the new lists when present', () => {
    const row = { ...emptyRewards(), decorOwned: ['planta'], decorPlaced: ['planta'], dailyDone: ['2026-10-08'] }
    expect(rewardsSchema.parse(row)).toEqual(row)
  })
})
