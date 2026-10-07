import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetStoreForTest } from '../../test/playerDb'
import { databaseNames, wipeAllDatabases } from '../../test/idb'
import { DB_NAME, MatesDb, SCHEMA_V1, SCHEMA_V2 } from '../storage/db'
import { openPlayerDb, getActiveDbName } from '../storage/playerDbs'
import { readLastPlayerId, readPlayers, removePlayer, savePlayer } from '../storage/registry'
import { useProgress } from './store'

const LAIA = { name: 'Laia', character: 'nyx', color: 'rosa' } as const
const PAU = { name: 'Pau', character: 'blau', color: 'blau' } as const
const answer = { skillId: 'A1', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }

const store = () => useProgress.getState()
const dbOf = (id: string): MatesDb => {
  const player = store().players.find((p) => p.id === id)
  if (!player) throw new Error(`no player ${id}`)
  return openPlayerDb(player.dbName)
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
})
afterEach(wipeAllDatabases)

describe('createPlayer', () => {
  it('creates a uuid player with its own database, makes it active and saves the profile there', async () => {
    const id = await store().createPlayer(LAIA)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(store().activePlayerId).toBe(id)
    expect(store().profile).toMatchObject({ ...LAIA, diagnosticDone: false })
    expect(store().players).toEqual([expect.objectContaining({ id, dbName: `mates-magiques-${id}`, ...LAIA })])
    expect(await dbOf(id).profile.get('me')).toMatchObject(LAIA)
    expect((await readPlayers()).players.map((p) => p.id)).toEqual([id])
    expect(await readLastPlayerId()).toBe(id)
  })
})

describe('isolation between players', () => {
  it('answers, petals and stickers of A never show up in B, and A keeps everything', async () => {
    const a = await store().createPlayer(LAIA)
    await store().finishDiagnostic({ A1: { mastery: 0.5, status: 'aprenent' } })
    await store().record(answer)
    await store().record(answer)
    await store().grantSticker()
    const petalsA = store().rewards.petals
    expect(petalsA).toBeGreaterThan(0)

    const b = await store().createPlayer(PAU)
    expect(store().activePlayerId).toBe(b)
    expect(store().profile?.name).toBe('Pau')
    expect(store().profile?.diagnosticDone).toBe(false)
    expect(store().skillStates).toEqual({})
    expect(store().rewards.petals).toBe(0)
    expect(store().rewards.stickers).toEqual([])
    await store().record(answer)
    expect(store().rewards.petals).toBe(3)

    expect(await dbOf(b).attempts.count()).toBe(1)
    expect(await dbOf(a).attempts.count()).toBe(2)
    expect((await dbOf(a).rewards.get('me'))?.petals).toBe(petalsA)

    await store().selectPlayer(a)
    expect(store().profile?.name).toBe('Laia')
    expect(store().profile?.diagnosticDone).toBe(true)
    expect(store().rewards.petals).toBe(petalsA)
    expect(store().rewards.stickers).toHaveLength(1)
    expect(store().skillStates.A1?.attempts).toBe(2)
  })

  it('switching resets the session and remembers when the player last played', async () => {
    const a = await store().createPlayer(LAIA)
    await store().record(answer)
    const sessionA = store().sessionId
    await store().createPlayer(PAU)
    const before = Date.now()
    await store().selectPlayer(a)
    expect(store().sessionId).not.toBe(sessionA)
    expect(store().sessionResults).toEqual([])
    expect(store().players.find((p) => p.id === a)?.lastPlayedAt).toBeGreaterThanOrEqual(before)
    expect(await readLastPlayerId()).toBe(a)
  })
})

describe('switching while a write is in flight', () => {
  it('an answer of A still being saved goes to A only, never to B', async () => {
    const a = await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    await store().selectPlayer(a)

    // Not awaited: the switch is requested while the answer is being written.
    const pending = store().record(answer)
    const switching = store().selectPlayer(b)
    await Promise.all([pending, switching])

    expect(store().activePlayerId).toBe(b)
    expect(store().rewards.petals).toBe(0)
    expect(store().skillStates).toEqual({})
    expect(await dbOf(b).attempts.count()).toBe(0)
    expect((await dbOf(b).rewards.get('me'))?.petals ?? 0).toBe(0)
    expect(await dbOf(a).attempts.count()).toBe(1)
    expect((await dbOf(a).rewards.get('me'))?.petals).toBe(3)
  })

  it('a write requested after the switch was asked for is dropped instead of landing in the other player', async () => {
    const a = await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    await store().selectPlayer(a)

    const switching = store().selectPlayer(b)
    // A stale screen of A answers right after the switch was requested.
    const late = store().record(answer)
    const sticker = store().grantSticker()
    await switching
    await expect(late).rejects.toThrow()
    await expect(sticker).resolves.toBeUndefined()

    expect(await dbOf(b).attempts.count()).toBe(0)
    expect(await dbOf(a).attempts.count()).toBe(0)
    expect(store().rewards.stickers).toEqual([])
  })
})

describe('every write of a stale screen is dropped after a switch', () => {
  it('profile, diagnostic, mission and reset requested for A do nothing once B is active', async () => {
    const a = await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    await store().selectPlayer(a)
    const switching = store().selectPlayer(b)
    const writes = Promise.all([
      store().saveProfile({ ...LAIA, name: 'Intrusa' }),
      store().finishDiagnostic({ A1: { mastery: 0.9, status: 'consolidant' } }),
      store().completeMission(),
      store().resetAll(),
    ])
    await switching
    const [, , , reset] = await writes
    expect(reset).toBe(false)
    expect(store().profile).toMatchObject({ name: 'Pau', diagnosticDone: false })
    expect(store().rewards.missionsDone).toEqual([])
    expect(await dbOf(b).skillStates.count()).toBe(0)
    expect(await dbOf(a).profile.get('me')).toMatchObject({ name: 'Laia', diagnosticDone: false })
  })
})

describe('renamePlayer', () => {
  it('updates the registry and that player’s own profile row, even when not active', async () => {
    const a = await store().createPlayer(LAIA)
    await store().createPlayer(PAU)
    await expect(store().renamePlayer(a, { name: '  Laieta ', color: 'menta' })).resolves.toBe(true)
    expect(store().players.find((p) => p.id === a)).toMatchObject({ name: 'Laieta', color: 'menta' })
    expect((await readPlayers()).players.find((p) => p.id === a)?.name).toBe('Laieta')
    expect(await dbOf(a).profile.get('me')).toMatchObject({ name: 'Laieta', color: 'menta' })
    expect(store().profile?.name).toBe('Pau')
  })

  it('renaming the active player updates the screen too; an invalid name changes nothing', async () => {
    const a = await store().createPlayer(LAIA)
    await store().renamePlayer(a, { name: 'Júlia' })
    expect(store().profile?.name).toBe('Júlia')
    await expect(store().renamePlayer(a, { name: '' })).resolves.toBe(false)
    await expect(store().renamePlayer(a, { name: 'x'.repeat(21) })).resolves.toBe(false)
    expect(store().profile?.name).toBe('Júlia')
    expect((await readPlayers()).players[0]?.name).toBe('Júlia')
  })
})

describe('deletePlayer', () => {
  it('deletes that player’s database and registry row, leaving the others untouched', async () => {
    const a = await store().createPlayer(LAIA)
    await store().record(answer)
    const b = await store().createPlayer(PAU)
    const dbNameB = `mates-magiques-${b}`

    await expect(store().deletePlayer(b)).resolves.toBe(true)
    expect(await Dexie.exists(dbNameB)).toBe(false)
    expect(await databaseNames()).not.toContain(dbNameB)
    expect(store().players.map((p) => p.id)).toEqual([a])
    expect(store().activePlayerId).toBeUndefined()
    expect(store().profile).toBeUndefined()
    expect(getActiveDbName()).toBeUndefined()
    expect(await readLastPlayerId()).toBeUndefined()
    expect(await dbOf(a).attempts.count()).toBe(1)
  })

  it('deleting a player that is not active keeps the active one playing', async () => {
    const a = await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    await store().deletePlayer(a)
    expect(store().activePlayerId).toBe(b)
    expect(store().profile?.name).toBe('Pau')
  })

  it('deleting an unknown player does nothing', async () => {
    await store().createPlayer(LAIA)
    await expect(store().deletePlayer('99999999-9999-4999-8999-999999999999')).resolves.toBe(false)
    expect(store().players).toHaveLength(1)
  })
})

describe('clearActivePlayer', () => {
  it('goes back to "nobody playing" without touching any data', async () => {
    const a = await store().createPlayer(LAIA)
    await store().record(answer)
    await store().clearActivePlayer()
    expect(store().activePlayerId).toBeUndefined()
    expect(store().profile).toBeUndefined()
    expect(store().rewards.petals).toBe(0)
    expect(await dbOf(a).attempts.count()).toBe(1)
    await expect(store().record(answer)).rejects.toThrow()
  })
})

describe('init', () => {
  it('two simultaneous starts (React StrictMode) never show the player without profile', async () => {
    await store().createPlayer(LAIA)
    resetStoreForTest()
    const seen: (string | undefined)[] = []
    const stop = useProgress.subscribe((s) => {
      if (s.loaded) seen.push(s.profile?.name)
    })
    await Promise.all([store().init(), store().init()])
    stop()
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((name) => name === 'Laia')).toBe(true)
  })

  it('switching never exposes an empty screen between the two players', async () => {
    const a = await store().createPlayer(LAIA)
    await store().createPlayer(PAU)
    const seen: (string | undefined)[] = []
    const stop = useProgress.subscribe((s) => seen.push(s.profile?.name))
    await store().selectPlayer(a)
    stop()
    expect(seen).not.toContain(undefined)
  })

  it('a single player is selected automatically', async () => {
    const a = await store().createPlayer(LAIA)
    resetStoreForTest()
    await store().init()
    expect(store().loaded).toBe(true)
    expect(store().activePlayerId).toBe(a)
    expect(store().profile?.name).toBe('Laia')
  })

  it('with two players nobody is selected until the child picks', async () => {
    await store().createPlayer(LAIA)
    await store().createPlayer(PAU)
    resetStoreForTest()
    await store().init()
    expect(store().players).toHaveLength(2)
    expect(store().activePlayerId).toBeUndefined()
    expect(store().profile).toBeUndefined()
  })

  it('adopts the legacy database: the child finds her progress right away', async () => {
    const v2 = new Dexie(DB_NAME)
    v2.version(1).stores(SCHEMA_V1)
    v2.version(2).stores(SCHEMA_V2)
    await v2.table('profile').put({ id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1 })
    await v2.table('rewards').put({ id: 'me', petals: 77, stickers: [], daysPlayed: [], missionsDone: [] })
    v2.close()

    await store().init()
    expect(store().players).toHaveLength(1)
    expect(store().profile?.name).toBe('Laia')
    expect(store().rewards.petals).toBe(77)
    expect(getActiveDbName()).toBe(DB_NAME)
  })

  it('when IndexedDB is unusable it still finishes loading and reports the storage error', async () => {
    const original = globalThis.indexedDB
    const broken = { open: () => { throw new Error('IndexedDB no disponible') }, databases: () => Promise.reject(new Error('no')) }
    Object.defineProperty(globalThis, 'indexedDB', { value: broken, configurable: true })
    Dexie.dependencies.indexedDB = broken as unknown as IDBFactory
    try {
      await store().init()
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', { value: original, configurable: true })
      Dexie.dependencies.indexedDB = original
    }
    expect(store().loaded).toBe(true)
    expect(store().storageError).toBe(true)
    expect(store().players).toEqual([])
  })
})

describe('another tab changed the players', () => {
  it('picks up new names and players, and stops playing as a player deleted elsewhere', async () => {
    const a = await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    const summaryA = store().players.find((p) => p.id === a)
    if (!summaryA) throw new Error('missing')
    // What the other tab wrote: A renamed, B (active here) deleted.
    await savePlayer({ ...summaryA, name: 'Laieta' })
    await removePlayer(b)

    await store().syncPlayers()
    expect(store().players.map((p) => p.name)).toEqual(['Laieta'])
    expect(store().activePlayerId).toBeUndefined()
    expect(store().profile).toBeUndefined()
  })

  it('keeps playing when the active player still exists', async () => {
    await store().createPlayer(LAIA)
    const b = await store().createPlayer(PAU)
    await store().syncPlayers()
    expect(store().activePlayerId).toBe(b)
    expect(store().profile?.name).toBe('Pau')
  })
})
