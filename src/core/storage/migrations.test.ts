import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { newFactState } from '../engine/leitner'
import { newSkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import { MatesDb, SCHEMA_V1, SCHEMA_VERSION } from './db'
import { META_KEYS, readMeta } from './meta'

const openDbs: Dexie[] = []
const names: string[] = []
const uniqueName = (): string => {
  const name = `migration-test-${crypto.randomUUID()}`
  names.push(name)
  return name
}

afterEach(async () => {
  openDbs.splice(0).forEach((d) => d.close())
  await Promise.all(names.splice(0).map((n) => Dexie.delete(n)))
})

const attempt = (i: number): Attempt => ({
  id: `att-${i}`,
  ambitId: 'mates',
  skillId: i % 2 === 0 ? 'A1' : 'A4',
  ...(i % 2 === 0 ? {} : { factKey: 'add:2+3' }),
  correct: i % 3 !== 0,
  rtMs: 900 + i,
  hintsUsed: i % 4 === 0 ? 1 : 0,
  cpaStage: 'concret',
  gameId: 'duel-llampec',
  sessionId: `s${i % 5}`,
  createdAt: 1_700_000_000_000 + i * 1000,
})

/** The database exactly as the first published app version (schema v1) wrote it. */
async function seedV1(name: string) {
  const v1 = new Dexie(name)
  v1.version(1).stores(SCHEMA_V1)
  const profile = { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1_690_000_000_000 }
  const skills = [{ ...newSkillState('A1'), attempts: 12, mastery: 0.8, status: 'consolidant' as const }, newSkillState('A4')]
  const facts = [{ ...newFactState('add:2+3', 1_700_000_000_000), box: 3, attempts: 7 }]
  const attempts = Array.from({ length: 250 }, (_, i) => attempt(i))
  const rewards = { id: 'me', petals: 321, stickers: ['s1', 's2'], daysPlayed: ['2026-09-01', '2026-09-02'], missionsDone: ['2026-09-01'] }
  await v1.table('profile').put(profile)
  await v1.table('skillStates').bulkPut(skills)
  await v1.table('factStates').bulkPut(facts)
  await v1.table('attempts').bulkPut(attempts)
  await v1.table('rewards').put(rewards)
  v1.close()
  return { profile, skills, facts, attempts, rewards }
}

describe('Dexie schema migrations', () => {
  it('the current schema version is 2', () => {
    expect(SCHEMA_VERSION).toBe(2)
  })

  it('upgrading a v1 database to v2 keeps every row and adds the meta table', async () => {
    const name = uniqueName()
    const seeded = await seedV1(name)

    const upgraded = new MatesDb(name)
    openDbs.push(upgraded)
    await upgraded.open()

    expect(upgraded.verno).toBe(SCHEMA_VERSION)
    expect(await upgraded.profile.get('me')).toEqual(seeded.profile)
    expect(await upgraded.skillStates.toArray()).toEqual(seeded.skills)
    expect(await upgraded.factStates.toArray()).toEqual(seeded.facts)
    expect(await upgraded.attempts.orderBy('createdAt').toArray()).toEqual(seeded.attempts)
    expect(await upgraded.rewards.get('me')).toEqual(seeded.rewards)
    // Indexes of v1 still work after the upgrade.
    expect(await upgraded.attempts.where('skillId').equals('A4').count()).toBe(125)

    const meta = await readMeta(upgraded)
    expect(meta.schemaVersion).toBe(2)
    // The original creation date is recovered from the profile instead of "today".
    expect(meta.createdAt).toBe(seeded.profile.createdAt)
    expect(meta.lastBackupAt).toBeUndefined()
  })

  it('a brand-new database is created directly at v2 with its meta rows', async () => {
    const before = Date.now()
    const fresh = new MatesDb(uniqueName())
    openDbs.push(fresh)
    await fresh.open()
    const meta = await readMeta(fresh)
    expect(meta.schemaVersion).toBe(2)
    expect(meta.createdAt).toBeGreaterThanOrEqual(before)
    expect(await fresh.profile.count()).toBe(0)
  })

  it('reading meta ignores damaged rows instead of failing', async () => {
    const fresh = new MatesDb(uniqueName())
    openDbs.push(fresh)
    await fresh.open()
    await fresh.meta.put({ key: META_KEYS.lastBackupAt, value: 'ahir' })
    const meta = await readMeta(fresh)
    expect(meta.lastBackupAt).toBeUndefined()
    expect(meta.schemaVersion).toBe(2)
  })
})
