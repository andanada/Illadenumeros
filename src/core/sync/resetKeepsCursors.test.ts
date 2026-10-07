import { afterEach, beforeEach, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { getDb } from '../storage/playerDbs'
import { readSyncState, writeSyncState } from './syncState'

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
})
afterEach(wipeAllDatabases)

it('"Començar de zero" keeps the sync cursors of the player', async () => {
  await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
  await writeSyncState(getDb(), { syncSeq: 40, lastPushedAt: 7, attemptsPushedAt: 6, syncedProfile: '{}' })
  expect(await useProgress.getState().resetAll()).toBe(true)
  expect(await readSyncState(getDb())).toMatchObject({ syncSeq: 40, lastPushedAt: 7, attemptsPushedAt: 6, syncedProfile: '{}' })
})
