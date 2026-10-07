import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { databaseNames, wipeAllDatabases } from '../../test/idb'
import { newFactState } from '../engine/leitner'
import { newSkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import { loadPlayers } from './bootstrap'
import { DB_NAME, MatesDb, SCHEMA_V1, SCHEMA_V2 } from './db'
import { META_KEYS, readMeta } from './meta'
import { closeAllPlayerDbs, openPlayerDb, playerDbName } from './playerDbs'
import { closeRegistry, getRegistry, readPlayers, REGISTRY_DB_NAME } from './registry'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const attempt = (i: number): Attempt => ({
  id: `att-${i}`,
  ambitId: 'mates',
  skillId: i % 2 === 0 ? 'A1' : 'A4',
  correct: i % 3 !== 0,
  rtMs: 900 + i,
  hintsUsed: 0,
  cpaStage: 'concret',
  gameId: 'duel-llampec',
  sessionId: `s${i % 5}`,
  createdAt: 1_700_000_000_000 + i * 1000,
})

/** The legacy single-player database exactly as the published v2 app left it. */
async function seedLegacyV2() {
  const v2 = new Dexie(DB_NAME)
  v2.version(1).stores(SCHEMA_V1)
  v2.version(2).stores(SCHEMA_V2)
  const profile = { id: 'me', name: 'Laia', character: 'mixa', color: 'menta', diagnosticDone: true, createdAt: 1_690_000_000_000 }
  const skills = [{ ...newSkillState('A1'), attempts: 12, mastery: 0.8, status: 'consolidant' as const }, newSkillState('A4')]
  const facts = [{ ...newFactState('add:2+3', 1_700_000_000_000), box: 3 }]
  const attempts = Array.from({ length: 40 }, (_, i) => attempt(i))
  const rewards = { id: 'me', petals: 321, stickers: ['s1', 's2'], daysPlayed: ['2026-09-01'], missionsDone: ['2026-09-01'] }
  const meta = [
    { key: META_KEYS.schemaVersion, value: 2 },
    { key: META_KEYS.createdAt, value: 1_690_000_000_000 },
    { key: META_KEYS.lastBackupAt, value: 1_695_000_000_000 },
  ]
  await v2.table('profile').put(profile)
  await v2.table('skillStates').bulkPut(skills)
  await v2.table('factStates').bulkPut(facts)
  await v2.table('attempts').bulkPut(attempts)
  await v2.table('rewards').put(rewards)
  await v2.table('meta').bulkPut(meta)
  v2.close()
  return { profile, skills, facts, attempts, rewards }
}

async function seedPlayerDb(id: string, name: string) {
  const database = new MatesDb(playerDbName(id))
  await database.profile.put({ id: 'me', name, character: 'blau', color: 'blau', diagnosticDone: false, createdAt: 5_000 })
  await database.meta.put({ key: META_KEYS.playerId, value: id })
  database.close()
}

afterEach(wipeAllDatabases)

describe('first run', () => {
  it('a brand-new device has no players and does not create the legacy database', async () => {
    expect(await loadPlayers()).toEqual([])
    expect(await Dexie.exists(DB_NAME)).toBe(false)
    expect(await databaseNames()).toEqual([REGISTRY_DB_NAME])
  })
})

describe('legacy adoption', () => {
  it('adopts the existing single-player database as the first player without moving any row', async () => {
    const seeded = await seedLegacyV2()
    const players = await loadPlayers()

    expect(players).toHaveLength(1)
    const [adopted] = players
    expect(adopted).toMatchObject({ dbName: DB_NAME, name: 'Laia', character: 'mixa', color: 'menta', createdAt: seeded.profile.createdAt })
    expect(adopted?.id).toMatch(UUID_RE)

    const legacy = openPlayerDb(DB_NAME)
    expect(await legacy.profile.get('me')).toEqual(seeded.profile)
    expect(await legacy.skillStates.toArray()).toEqual(seeded.skills)
    expect(await legacy.factStates.toArray()).toEqual(seeded.facts)
    expect(await legacy.attempts.orderBy('createdAt').toArray()).toEqual(seeded.attempts)
    expect(await legacy.rewards.get('me')).toEqual(seeded.rewards)
    const meta = await readMeta(legacy)
    expect(meta.lastBackupAt).toBe(1_695_000_000_000)
    // The player id is also written inside its own database, so a rebuild keeps the same id.
    expect(meta.playerId).toBe(adopted?.id)
  })

  it('adoption runs once: the next start reads the same player from the registry', async () => {
    await seedLegacyV2()
    const first = await loadPlayers()
    closeAllPlayerDbs()
    closeRegistry()
    expect(await loadPlayers()).toEqual(first)
  })

  it('two simultaneous starts (React StrictMode) adopt the legacy database once, with one id', async () => {
    await seedLegacyV2()
    const [first, second] = await Promise.all([loadPlayers(), loadPlayers()])
    expect(first).toEqual(second)
    expect((await readPlayers()).players.map((p) => p.id)).toEqual(first.map((p) => p.id))
    expect((await readMeta(openPlayerDb(DB_NAME))).playerId).toBe(first[0]?.id)
  })

  it('a legacy database without a profile is not adopted (and is left untouched)', async () => {
    const empty = new MatesDb(DB_NAME)
    await empty.open()
    empty.close()
    expect(await loadPlayers()).toEqual([])
    expect(await Dexie.exists(DB_NAME)).toBe(true)
  })
})

describe('registry corruption', () => {
  it('damaged registry rows are rebuilt from the player databases, keeping their ids', async () => {
    const idA = '11111111-1111-4111-8111-111111111111'
    const idB = '22222222-2222-4222-8222-222222222222'
    await seedPlayerDb(idA, 'Laia')
    await seedPlayerDb(idB, 'Pau')
    await getRegistry().players.put({ id: 'x', broken: true } as never)

    const players = await loadPlayers()
    expect(players.map((p) => [p.id, p.name]).sort()).toEqual([
      [idA, 'Laia'],
      [idB, 'Pau'],
    ])
    expect((await readPlayers()).players).toHaveLength(2)
  })

  it('a registry that cannot be opened is recreated and rebuilt, without crashing', async () => {
    await seedLegacyV2()
    // A registry "from the future" (higher version, other tables) cannot be opened by this app.
    const future = new Dexie(REGISTRY_DB_NAME)
    future.version(30).stores({ other: 'id' })
    await future.open()
    future.close()

    const players = await loadPlayers()
    expect(players.map((p) => p.name)).toEqual(['Laia'])
    expect(await openPlayerDb(DB_NAME).attempts.count()).toBe(40)
  })
})
