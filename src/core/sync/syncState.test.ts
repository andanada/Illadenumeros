import { beforeEach, describe, expect, it } from 'vitest'
import { activateTestPlayer } from '../../test/playerDb'
import type { MatesDb } from '../storage/db'
import { MAX_QUARANTINE, readSyncState, SYNC_META_KEYS, writeSyncState } from './syncState'

let db: MatesDb
beforeEach(() => {
  db = activateTestPlayer()
})

describe('sync state in the player meta table', () => {
  it('defaults to zero cursors and an empty quarantine', async () => {
    expect(await readSyncState(db)).toEqual({ syncSeq: 0, lastPushedAt: 0, attemptsPushedAt: 0, quarantine: [] })
  })

  it('writes and reads back a partial patch', async () => {
    await writeSyncState(db, { syncSeq: 12, lastPushedAt: 99, syncedRewards: '{"a":1}', quarantine: ['skill:A1@5'] })
    await writeSyncState(db, { attemptsPushedAt: 50 })
    expect(await readSyncState(db)).toEqual({ syncSeq: 12, lastPushedAt: 99, attemptsPushedAt: 50, syncedRewards: '{"a":1}', quarantine: ['skill:A1@5'] })
  })

  it('ignores damaged values', async () => {
    await db.meta.bulkPut([
      { key: SYNC_META_KEYS.syncSeq, value: -3 },
      { key: SYNC_META_KEYS.quarantine, value: 'nope' },
    ])
    expect(await readSyncState(db)).toMatchObject({ syncSeq: 0, quarantine: [] })
  })

  it('caps the quarantine list (keeps the newest)', async () => {
    const many = Array.from({ length: MAX_QUARANTINE + 5 }, (_, i) => `attempt:${i}`)
    await writeSyncState(db, { quarantine: many })
    const { quarantine } = await readSyncState(db)
    expect(quarantine).toHaveLength(MAX_QUARANTINE)
    expect(quarantine.at(-1)).toBe(`attempt:${MAX_QUARANTINE + 4}`)
  })
})
