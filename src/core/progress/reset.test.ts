import { beforeEach, describe, expect, it } from 'vitest'
import { emptyRewards, SCHEMA_VERSION, type MatesDb } from '../storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { readMeta, setLastBackupAt, setPlayerId } from '../storage/meta'
import { useProgress } from './store'

const recordInput = { skillId: 'A1', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear(), db.meta.clear()])
  useProgress.setState({ loaded: true, profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards(), sessionResults: [], storageError: false })
})

async function playABit() {
  await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
  await useProgress.getState().record(recordInput)
  await setLastBackupAt(db, 1_000)
}

describe('resetAll', () => {
  it('clears the progress and the backup date, but keeps who the player is and the schema version', async () => {
    await playABit()
    const before = Date.now()
    await expect(useProgress.getState().resetAll()).resolves.toBe(true)

    // The player stays (name, character, colour) and redoes the diagnostic.
    expect(await db.profile.get('me')).toMatchObject({ name: 'Júlia', diagnosticDone: false })
    expect(await db.attempts.count()).toBe(0)
    expect(await db.rewards.count()).toBe(0)
    const meta = await readMeta(db)
    expect(meta.schemaVersion).toBe(SCHEMA_VERSION)
    expect(meta.lastBackupAt).toBeUndefined()
    expect(meta.createdAt).toBeGreaterThanOrEqual(before)
    expect(useProgress.getState().profile).toMatchObject({ name: 'Júlia', diagnosticDone: false })
    expect(useProgress.getState().rewards.petals).toBe(0)
  })

  it('keeps the player id stamped in the database', async () => {
    const id = crypto.randomUUID()
    await setPlayerId(db, id)
    await playABit()
    await useProgress.getState().resetAll()
    expect((await readMeta(db)).playerId).toBe(id)
  })

  it('is all-or-nothing: if a write fails, the saved progress stays on disk', async () => {
    await playABit()
    const original = db.meta.bulkPut.bind(db.meta)
    db.meta.bulkPut = (() => Promise.reject(new Error('disc ple'))) as unknown as typeof db.meta.bulkPut
    try {
      await expect(useProgress.getState().resetAll()).resolves.toBe(false)
    } finally {
      db.meta.bulkPut = original
    }
    expect(await db.profile.count()).toBe(1)
    expect(await db.attempts.count()).toBe(1)
    expect((await readMeta(db)).lastBackupAt).toBe(1_000)
    expect(useProgress.getState().storageError).toBe(true)
    // Memory is not wiped either, so the screen never pretends the progress is gone.
    expect(useProgress.getState().profile?.name).toBe('Júlia')
  })
})
