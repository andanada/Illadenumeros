import { afterEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { playerDbName } from './playerDbs'
import {
  getRegistry,
  readLastPlayerId,
  readPlayers,
  REGISTRY_DB_NAME,
  removePlayer,
  savePlayer,
  writeLastPlayerId,
  type PlayerSummary,
} from './registry'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'

const player = (id: string, over: Partial<PlayerSummary> = {}): PlayerSummary => ({
  id,
  dbName: playerDbName(id),
  name: 'Laia',
  character: 'nyx',
  color: 'rosa',
  createdAt: 1_000,
  lastPlayedAt: 2_000,
  ...over,
})

afterEach(wipeAllDatabases)

describe('player registry', () => {
  it('lives in its own database', () => {
    expect(REGISTRY_DB_NAME).toBe('mates-registry')
    expect(getRegistry().name).toBe('mates-registry')
  })

  it('creates, lists (oldest first), updates and removes players', async () => {
    await savePlayer(player(ID_B, { name: 'Pau', createdAt: 5_000 }))
    await savePlayer(player(ID_A))
    expect((await readPlayers()).players.map((p) => p.name)).toEqual(['Laia', 'Pau'])

    await savePlayer(player(ID_A, { name: 'Laieta' }))
    expect((await readPlayers()).players.find((p) => p.id === ID_A)?.name).toBe('Laieta')

    await removePlayer(ID_A)
    expect((await readPlayers()).players.map((p) => p.id)).toEqual([ID_B])
  })

  it('refuses a player that is not valid (id must be a uuid, name 1-20 chars)', async () => {
    await expect(savePlayer(player(ID_A, { id: 'me' }))).rejects.toThrow()
    await expect(savePlayer(player(ID_A, { name: '   ' }))).rejects.toThrow()
    await expect(savePlayer(player(ID_A, { dbName: 'una-altra-cosa' }))).rejects.toThrow()
    expect((await readPlayers()).players).toEqual([])
  })

  it('skips damaged rows and counts them', async () => {
    await savePlayer(player(ID_A))
    await getRegistry().players.put({ id: 'trencat', name: 42 } as unknown as PlayerSummary)
    const read = await readPlayers()
    expect(read.players.map((p) => p.id)).toEqual([ID_A])
    expect(read.damaged).toBe(1)
  })

  it('remembers the last player and can forget it', async () => {
    expect(await readLastPlayerId()).toBeUndefined()
    await writeLastPlayerId(ID_A)
    expect(await readLastPlayerId()).toBe(ID_A)
    await writeLastPlayerId(undefined)
    expect(await readLastPlayerId()).toBeUndefined()
  })
})
