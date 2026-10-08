import { beforeEach, describe, expect, it } from 'vitest'
import { newFactState, type FactState } from '../engine/leitner'
import { newSkillState, type SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import { useProgress } from '../progress/store'
import { exportProgress, importProgress, readBackup, serializeBackup } from './backup'
import { BACKUP_APP_ID, BACKUP_FORMAT_VERSION } from './backupSchema'
import { emptyRewards, type MatesDb, type Profile, type Rewards } from './db'
import { activateTestPlayer } from '../../test/playerDb'

const PROFILE: Profile = { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1_690_000_000_000 }
const REWARDS: Rewards = { id: 'me', petals: 120, stickers: ['s1'], daysPlayed: ['2026-09-01', '2026-09-03'], missionsDone: ['2026-09-01'], decorOwned: [], decorPlaced: [], dailyDone: [] }

const skill = (id: string, over: Partial<SkillState> = {}): SkillState => ({ ...newSkillState(id), ...over })
const fact = (key: string, over: Partial<FactState> = {}): FactState => ({ ...newFactState(key, 1_000), ...over })
const attempt = (id: string, skillId: string, createdAt: number): Attempt => ({
  id,
  ambitId: 'mates',
  skillId,
  correct: true,
  rtMs: 1000,
  hintsUsed: 0,
  cpaStage: 'concret',
  gameId: 'repte-illa',
  sessionId: 's1',
  createdAt,
})

async function clearAll() {
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear(), db.meta.clear()])
}

async function seed(data: { skills?: SkillState[]; facts?: FactState[]; attempts?: Attempt[]; rewards?: Rewards; profile?: Profile }) {
  await db.profile.put(data.profile ?? PROFILE)
  await db.skillStates.bulkPut(data.skills ?? [])
  await db.factStates.bulkPut(data.facts ?? [])
  await db.attempts.bulkPut(data.attempts ?? [])
  await db.rewards.put(data.rewards ?? REWARDS)
}

const snapshot = async () => ({
  profile: await db.profile.get('me'),
  skills: await db.skillStates.orderBy('skillId').toArray(),
  facts: await db.factStates.orderBy('factKey').toArray(),
  attempts: await db.attempts.orderBy('createdAt').toArray(),
  rewards: await db.rewards.get('me'),
})

const manyAttempts = (n: number): Attempt[] => Array.from({ length: n }, (_, i) => attempt(`a${i}`, i % 2 ? 'A1' : 'A4', 10_000 + i))

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await clearAll()
  useProgress.setState({ loaded: true, profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards(), sessionResults: [], storageError: false })
})

describe('exportProgress', () => {
  it('produces a compact, versioned backup of every table', async () => {
    await seed({ skills: [skill('A1', { attempts: 3 })], facts: [fact('add:2+3')], attempts: manyAttempts(3000) })
    const file = await exportProgress(() => 5_000)
    expect(file).toMatchObject({ app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: 5_000, profile: PROFILE, rewards: REWARDS })
    expect(file.skillStates).toHaveLength(1)
    expect(file.attempts).toHaveLength(3000)
    const text = serializeBackup(file)
    expect(text).not.toContain('\n')
    expect(text).not.toContain('  ')
  })
})

describe('importProgress', () => {
  it('roundtrip: export then import into an empty database gives identical data and reloads the store', async () => {
    await seed({ skills: [skill('A1', { attempts: 3 }), skill('A4')], facts: [fact('add:2+3', { box: 2 })], attempts: manyAttempts(500) })
    const before = await snapshot()
    const text = serializeBackup(await exportProgress())
    await clearAll()

    const result = await importProgress(new Blob([text], { type: 'application/json' }))

    expect(result).toMatchObject({ ok: true, strategy: 'replace', skipped: 0, counts: { skills: 2, facts: 1, attempts: 500 } })
    expect(await snapshot()).toEqual(before)
    expect(useProgress.getState().profile?.name).toBe('Laia')
    expect(useProgress.getState().rewards.petals).toBe(120)
  })

  it.each([
    ['text that is not JSON', 'no és json {', 'no és una còpia'],
    ['JSON from another app', JSON.stringify({ app: 'una-altra', formatVersion: 1 }), 'no és una còpia'],
    ['a newer format version', JSON.stringify({ app: 'mates-magiques', formatVersion: 99, exportedAt: 1 }), 'versió més nova'],
    ['a JSON array', '[1,2,3]', 'no és una còpia'],
  ])('rejects %s with a clear Catalan message, without throwing or touching data', async (_label, text, message) => {
    await seed({ skills: [skill('A1')] })
    const before = await snapshot()
    const result = await importProgress(text, { strategy: 'replace' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
    expect(await snapshot()).toEqual(before)
  })

  it('skips invalid rows, imports the rest and reports how many were skipped', async () => {
    await seed({ skills: [skill('A1')], facts: [fact('add:1+1')], attempts: manyAttempts(4) })
    const file = await exportProgress()
    await clearAll()
    const tampered = {
      ...file,
      skillStates: [...file.skillStates, { skillId: 'A9', mastery: 7 }],
      factStates: [...file.factStates, 'brossa'],
      attempts: [...file.attempts, { id: 'x' }, null],
    }
    const result = await importProgress(JSON.stringify(tampered))
    expect(result).toMatchObject({ ok: true, skipped: 4, counts: { skills: 1, facts: 1, attempts: 4 } })
    expect(await db.attempts.count()).toBe(4)
  })

  it('asks for a strategy when the device already has progress', async () => {
    await seed({ skills: [skill('A1')] })
    const text = serializeBackup(await exportProgress())
    const result = await importProgress(text)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('needs-strategy')
      expect(result.error).toContain('Ja hi ha progrés')
    }
  })

  it('keep-newer keeps the more recently updated fact and skill from either side', async () => {
    // Incoming copy: old A1 work, a newer fact add:2+3, an old fact add:1+1 and a skill only it has.
    await seed({
      skills: [skill('A1', { attempts: 2 }), skill('A4', { attempts: 9, mastery: 0.9 }), skill('B1', { attempts: 1 })],
      facts: [fact('add:2+3', { lastSeen: 9_000, box: 4 }), fact('add:1+1', { lastSeen: 1_000, box: 1 })],
      attempts: [attempt('old-a1', 'A1', 1_000), attempt('new-a4', 'A4', 9_000), attempt('b1', 'B1', 2_000)],
      rewards: { ...REWARDS, petals: 50, stickers: ['s2'], daysPlayed: ['2026-08-30'] },
    })
    const incoming = serializeBackup(await exportProgress())
    await clearAll()
    // Local device: newer A1 work, older A4, a newer add:1+1 and an older add:2+3.
    await seed({
      skills: [skill('A1', { attempts: 20, mastery: 0.7 }), skill('A4', { attempts: 3, mastery: 0.2 })],
      facts: [fact('add:2+3', { lastSeen: 2_000, box: 1 }), fact('add:1+1', { lastSeen: 8_000, box: 5 })],
      attempts: [attempt('local-a1', 'A1', 8_000), attempt('local-a4', 'A4', 3_000)],
    })

    const result = await importProgress(incoming, { strategy: 'keep-newer' })

    expect(result).toMatchObject({ ok: true, strategy: 'keep-newer' })
    const skills = Object.fromEntries((await db.skillStates.toArray()).map((s) => [s.skillId, s]))
    expect(skills.A1?.attempts).toBe(20)
    expect(skills.A4?.mastery).toBe(0.9)
    expect(skills.B1).toBeDefined()
    const facts = Object.fromEntries((await db.factStates.toArray()).map((f) => [f.factKey, f]))
    expect(facts['add:2+3']?.box).toBe(4)
    expect(facts['add:1+1']?.box).toBe(5)
    expect((await db.attempts.toArray()).map((a) => a.id).sort()).toEqual(['b1', 'local-a1', 'local-a4', 'new-a4', 'old-a1'])
    const rewards = await db.rewards.get('me')
    expect(rewards?.petals).toBe(120)
    expect(rewards?.stickers).toEqual(['s1', 's2'])
    expect(rewards?.daysPlayed).toEqual(['2026-08-30', '2026-09-01', '2026-09-03'])
    expect(useProgress.getState().skillStates.A4?.mastery).toBe(0.9)
  })

  it('rolls back everything when a write fails half-way, leaving the old data intact', async () => {
    await seed({ skills: [skill('A1', { attempts: 4 })], attempts: manyAttempts(10) })
    const text = serializeBackup({ ...(await exportProgress()), skillStates: [skill('Z9')], attempts: manyAttempts(2) })
    const before = await snapshot()
    const original = db.attempts.bulkPut.bind(db.attempts)
    db.attempts.bulkPut = (() => Promise.reject(new Error('disc ple'))) as unknown as typeof db.attempts.bulkPut
    try {
      const result = await importProgress(text, { strategy: 'replace' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('No s’ha pogut recuperar')
    } finally {
      db.attempts.bulkPut = original
    }
    expect(await snapshot()).toEqual(before)
  })
})

describe('readBackup', () => {
  it('returns a preview summary before anything is applied', async () => {
    await seed({ skills: [skill('A1'), skill('A4')], facts: [fact('add:2+3')], attempts: manyAttempts(7) })
    const text = serializeBackup(await exportProgress(() => 1_759_000_000_000))
    const preview = await readBackup(text)
    expect(preview).toMatchObject({
      ok: true,
      skipped: 0,
      summary: { childName: 'Laia', exportedAt: 1_759_000_000_000, skills: 2, facts: 1, attempts: 7 },
    })
    expect(await db.attempts.count()).toBe(7)
  })
})
