import { beforeEach, describe, expect, it } from 'vitest'
import { newSkillState } from '../engine/mastery'
import { dayKey } from '../engine/retention'
import { emptyRewards, type MatesDb } from '../storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import type { Attempt } from './applyAnswer'
import { readPlayerData } from './playerData'
import { useProgress } from './store'

let db: MatesDb
const DAY = 86_400_000

const attempt = (id: string, daysAgo: number, over: Partial<Attempt> = {}): Attempt => ({
  id,
  ambitId: 'mates',
  skillId: 'A4',
  correct: true,
  rtMs: 1000,
  hintsUsed: 0,
  cpaStage: 'concret',
  gameId: 'duel-llampec',
  sessionId: 's',
  createdAt: Date.now() - daysAgo * DAY,
  ...over,
})

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear()])
  useProgress.setState({ loaded: true, profile: undefined, skillStates: {}, factStates: {}, cleanDays: {}, rewards: emptyRewards(), sessionResults: [], storageError: false })
})

describe('reading stored progress (migration-safe)', () => {
  it('rebuilds clean days from attempts and downgrades a legacy "dominada" core skill without writing', async () => {
    const legacy = { ...newSkillState('A4'), status: 'dominada' as const, mastery: 0.95, accuracy: 0.95, attempts: 60, correct: 58, sessions: ['a', 'b'] }
    await db.skillStates.put(legacy)
    await db.attempts.bulkPut([attempt('1', 0), attempt('2', 2), attempt('3', 2, { hintsUsed: 1 }), attempt('4', 400)])
    const data = await readPlayerData(db)
    expect(data.cleanDays.A4).toEqual([dayKey(Date.now() - 2 * DAY), dayKey(Date.now())])
    expect(data.skillStates.A4?.status).toBe('consolidant')
    expect(data.skillStates.A4?.mastery).toBe(0.95)
    expect((await db.skillStates.get('A4'))?.status).toBe('dominada')
  })

  it('keeps every stored row, whatever its status', async () => {
    await db.skillStates.bulkPut([newSkillState('A1'), { ...newSkillState('A2'), status: 'dominada' }])
    const data = await readPlayerData(db)
    expect(Object.keys(data.skillStates).sort()).toEqual(['A1', 'A2'])
    expect(data.skillStates.A2?.status).toBe('dominada')
  })
})

describe('record keeps the clean days', () => {
  it('adds today only for clean correct answers and does not duplicate it', async () => {
    const input = { skillId: 'A4', factKey: 'add:2+3', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'marc-magic' as const }
    await useProgress.getState().record({ ...input, hintsUsed: 1 })
    expect(useProgress.getState().cleanDays.A4 ?? []).toEqual([])
    await useProgress.getState().record(input)
    await useProgress.getState().record(input)
    expect(useProgress.getState().cleanDays.A4).toEqual([dayKey(Date.now())])
  })
})
