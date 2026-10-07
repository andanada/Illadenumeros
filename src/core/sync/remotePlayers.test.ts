import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { openPlayerDb } from '../storage/playerDbs'
import { adoptRemoteProfile, createLocalPlayer, remoteInput } from './remotePlayers'
import { writeSyncState } from './syncState'

const ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427'
const remote = (over: Partial<{ name: string; character: string | null; color: string | null }> = {}) => ({
  id: ID,
  name: 'Laia',
  character: 'mixa',
  color: 'menta',
  createdAt: 10.7,
  updatedAt: 20,
  ...over,
})

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
})
afterEach(wipeAllDatabases)

describe('remoteInput', () => {
  it('keeps valid values, falls back for unknown character/colour, rejects a bad name', () => {
    expect(remoteInput(remote())).toEqual({ name: 'Laia', character: 'mixa', color: 'menta', createdAt: 10 })
    expect(remoteInput(remote({ character: null, color: 'groc' }))).toMatchObject({ character: 'nyx', color: 'lila' })
    expect(remoteInput(remote({ name: '' }))).toBeUndefined()
  })
})

describe('createLocalPlayer / adoptRemoteProfile', () => {
  it('does not create a player whose server data is unusable', async () => {
    expect(await createLocalPlayer(remote({ name: ' ' }))).toBeUndefined()
  })

  it('a local rename not yet pushed wins over a remote one (no adoption)', async () => {
    const id = await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    const player = useProgress.getState().players[0]!
    const db = openPlayerDb(player.dbName)
    await writeSyncState(db, { syncedProfile: JSON.stringify({ name: 'Laia', character: 'nyx', color: 'rosa', createdAt: player.createdAt }) })
    await useProgress.getState().renamePlayer(id, { name: 'Lali' })
    const renamed = useProgress.getState().players[0]!
    expect(await adoptRemoteProfile(renamed, { ...remote({ name: 'Laieta', character: 'nyx', color: 'rosa' }), id, createdAt: player.createdAt })).toBe(false)
    expect((await db.profile.get('me'))?.name).toBe('Lali')
  })

  it('never adopts before the first agreement with the server', async () => {
    await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    const player = useProgress.getState().players[0]!
    expect(await adoptRemoteProfile(player, { ...remote({ name: 'Altre' }), id: player.id })).toBe(false)
  })
})
