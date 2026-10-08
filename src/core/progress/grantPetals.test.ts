import { beforeEach, describe, expect, it } from 'vitest'
import { activateTestPlayer, resetStoreForTest } from '../../test/playerDb'
import { emptyRewards, type MatesDb } from '../storage/db'
import { onWorldStored, type WorldRow } from '../storage/worldRow'
import { normalizeWorld } from '../sync/mergeWorld'
import { onProgressChanged } from '../sync/progressEvents'
import { readSyncState } from '../sync/syncState'
import { useProgress } from './store'

const recordInput = { skillId: 'A1', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.rewards.clear(), db.world.clear(), db.meta.clear(), db.profile.clear(), db.attempts.clear()])
  useProgress.setState({ rewards: emptyRewards(), storageError: false })
})

describe('grantPetals', () => {
  it('adds the petals in memory and on disk and tells the sync', async () => {
    let changes = 0
    const off = onProgressChanged(() => (changes += 1))
    await expect(useProgress.getState().grantPetals(5)).resolves.toBe(true)
    off()
    expect(useProgress.getState().rewards.petals).toBe(5)
    expect((await db.rewards.get('me'))?.petals).toBe(5)
    expect(changes).toBe(1)
  })

  it.each([0, -3, 1.5, 1001, Number.NaN])('refuses %s and changes nothing', async (amount) => {
    await expect(useProgress.getState().grantPetals(amount)).resolves.toBe(false)
    expect(useProgress.getState().rewards.petals).toBe(0)
    expect(await db.rewards.get('me')).toBeUndefined()
  })

  it('is serialised with the answers: nothing is lost when both happen at once', async () => {
    await Promise.all([useProgress.getState().record(recordInput), useProgress.getState().grantPetals(4), useProgress.getState().record(recordInput)])
    expect(useProgress.getState().rewards.petals).toBe(3 + 4 + 3)
    expect((await db.rewards.get('me'))?.petals).toBe(10)
  })

  it('does nothing when nobody is playing', async () => {
    resetStoreForTest()
    await expect(useProgress.getState().grantPetals(2)).resolves.toBe(false)
  })

  it('keeps the petals in memory and warns when the disk write fails', async () => {
    const original = db.rewards.put.bind(db.rewards)
    db.rewards.put = (() => Promise.reject(new Error('disc ple'))) as unknown as typeof db.rewards.put
    try {
      await expect(useProgress.getState().grantPetals(2)).resolves.toBe(false)
    } finally {
      db.rewards.put = original
    }
    expect(useProgress.getState().rewards.petals).toBe(2)
    expect(useProgress.getState().storageError).toBe(true)
  })
})

describe('resetAll and the town', () => {
  const row: WorldRow = {
    id: 'world',
    avatar: {
      skin: 's3',
      hair: { style: 'cuetes', color: 'carbo' },
      eyes: 'punt',
      mouth: 'somriure',
      top: { item: 'jersei', color: 'menta' },
      bottom: { item: 'pantalo', color: 'cel' },
      shoes: { item: 'bambes', color: 'neu' },
      accessory: null,
    },
    owned: ['jersei', 'sofa'],
    placed: { casa: [{ uid: 'u1', item: 'sofa', x: 0.5, y: 0.5, z: 1 }] },
    placedAt: { casa: 9 },
    pets: ['melo'],
    avatarUpdatedAt: 7,
    petalsSpent: 40,
  }

  it('keeps what she owns and wears but restarts the coin count (petals and spent both back to 0)', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    await useProgress.getState().grantPetals(50)
    await db.world.put(row)
    const announced: string[] = []
    const off = onWorldStored((name) => announced.push(name))
    await expect(useProgress.getState().resetAll()).resolves.toBe(true)
    off()
    const after = await db.world.get('world')
    expect(after).toEqual({ ...row, petalsSpent: 0 })
    expect(announced).toEqual([db.name])
    // Agreed with the cloud like the emptied rewards: the reset stays on this device.
    expect((await readSyncState(db)).syncedWorld).toBe(JSON.stringify(normalizeWorld({ ...row, petalsSpent: 0 })))
  })

  it('a player without a town row stays without one', async () => {
    await expect(useProgress.getState().resetAll()).resolves.toBe(true)
    expect(await db.world.count()).toBe(0)
  })
})
