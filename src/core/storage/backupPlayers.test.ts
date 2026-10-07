import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { exportProgress, importProgress, serializeBackup } from './backup'
import { openPlayerDb } from './playerDbs'
import { readPlayers } from './registry'

const answer = { skillId: 'A1', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }
const store = () => useProgress.getState()
const dbOf = (id: string) => openPlayerDb(store().players.find((p) => p.id === id)?.dbName ?? '')

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
})
afterEach(wipeAllDatabases)

describe('backups with several players', () => {
  it('exports only the active player', async () => {
    await store().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    await store().record(answer)
    await store().createPlayer({ name: 'Pau', character: 'blau', color: 'blau' })
    const file = await exportProgress(() => 1)
    expect(file.profile?.name).toBe('Pau')
    expect(file.attempts).toHaveLength(0)
  })

  it('a restore goes into the active player only; the registry follows the restored profile', async () => {
    const a = await store().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    await store().record(answer)
    await store().record(answer)
    const backupOfA = serializeBackup(await exportProgress(() => 1))

    const b = await store().createPlayer({ name: 'Pau', character: 'blau', color: 'blau' })
    await store().record(answer)
    const result = await importProgress(backupOfA, { strategy: 'replace' })
    expect(result.ok).toBe(true)

    expect(store().activePlayerId).toBe(b)
    expect(await dbOf(b).attempts.count()).toBe(2)
    expect(store().skillStates.A1?.attempts).toBe(2)
    expect(store().players.find((p) => p.id === b)?.name).toBe('Laia')
    expect((await readPlayers()).players.find((p) => p.id === b)?.character).toBe('nyx')
    // The other player is untouched.
    expect(await dbOf(a).attempts.count()).toBe(2)
    expect(store().players.find((p) => p.id === a)?.name).toBe('Laia')
  })

  it('keep-newer keeps the active player’s own name', async () => {
    await store().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    await store().record(answer)
    const backupOfA = serializeBackup(await exportProgress(() => 1))
    const b = await store().createPlayer({ name: 'Pau', character: 'blau', color: 'blau' })
    await importProgress(backupOfA, { strategy: 'keep-newer' })
    expect(store().players.find((p) => p.id === b)?.name).toBe('Pau')
    expect(await dbOf(b).attempts.count()).toBe(1)
  })
})
