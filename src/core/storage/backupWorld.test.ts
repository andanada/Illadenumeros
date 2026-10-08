import { beforeEach, describe, expect, it } from 'vitest'
import { activateTestPlayer } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { exportProgress, importProgress, serializeBackup } from './backup'
import { mergeProgress } from './backupMerge'
import { BACKUP_APP_ID, BACKUP_FORMAT_VERSION, parseBackup, type ProgressData } from './backupSchema'
import { emptyRewards, type MatesDb, type Profile } from './db'
import { onWorldStored, type WorldRow } from './worldRow'

const PROFILE: Profile = { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1 }

const world = (o: Partial<WorldRow> = {}): WorldRow => ({
  id: 'world',
  avatar: {
    skin: 's2',
    hair: { style: 'cuetes', color: 'xocolata' },
    eyes: 'punt',
    mouth: 'somriure',
    top: { item: 'samarreta', color: 'coral' },
    bottom: { item: 'pantalo', color: 'cel' },
    shoes: { item: 'bambes', color: 'neu' },
    accessory: null,
  },
  owned: [],
  placed: {},
  placedAt: {},
  pets: [],
  avatarUpdatedAt: 0,
  petalsSpent: 0,
  ...o,
})

const data = (w: WorldRow | null): ProgressData => ({ profile: PROFILE, skillStates: [], factStates: [], attempts: [], rewards: null, world: w })
const sofa = (uid: string) => ({ uid, item: 'sofa', x: 0.5, y: 0.5, z: 1 })

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.rewards.clear(), db.world.clear(), db.meta.clear()])
  useProgress.setState({ loaded: true, profile: undefined, rewards: emptyRewards(), storageError: false })
})

describe('backup of the town', () => {
  it('exports the world row (null when the town was never opened)', async () => {
    await db.profile.put(PROFILE)
    expect((await exportProgress()).world).toBeNull()
    await db.world.put(world({ owned: ['sofa'] }))
    expect((await exportProgress()).world).toEqual(world({ owned: ['sofa'] }))
  })

  it('reads old backups without a world (same format version) and drops a damaged world, counting it', () => {
    const old = { app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: 1, profile: PROFILE, skillStates: [], factStates: [], attempts: [], rewards: null }
    const parsedOld = parseBackup(old)
    expect(parsedOld.ok && parsedOld.file.world).toBeNull()
    const damaged = parseBackup({ ...old, world: { ...world(), owned: ['No Vàlid'] } })
    expect(damaged.ok && damaged.skipped).toBe(1)
    expect(damaged.ok && damaged.file.world).toBeNull()
  })

  it('replace restores the town of the file (and clears it when the file has none)', async () => {
    await db.profile.put(PROFILE)
    await db.world.put(world({ owned: ['llum'] }))
    const file = { ...(await exportProgress()), world: world({ owned: ['sofa'], petalsSpent: 4 }) }
    const announced: string[] = []
    const off = onWorldStored((name) => announced.push(name))
    expect((await importProgress(serializeBackup(file), { strategy: 'replace' })).ok).toBe(true)
    off()
    expect(await db.world.get('world')).toEqual(world({ owned: ['sofa'], petalsSpent: 4 }))
    expect(announced).toEqual([db.name])
    expect((await importProgress(serializeBackup({ ...file, world: null }), { strategy: 'replace' })).ok).toBe(true)
    expect(await db.world.count()).toBe(0)
  })

  it('keep-newer merges like the sync: union of owned/pets, newest avatar and scene, max coins spent', async () => {
    const local = world({ owned: ['llum'], pets: ['nyx'], petalsSpent: 9, avatarUpdatedAt: 5, placed: { casa: [sofa('a')] }, placedAt: { casa: 50 } })
    const incoming = world({
      owned: ['sofa'],
      pets: ['melo'],
      petalsSpent: 3,
      avatarUpdatedAt: 8,
      avatar: { ...world().avatar, top: { item: 'jersei', color: 'lila' } },
      placed: { casa: [sofa('b')], botiga: [sofa('c')] },
      placedAt: { casa: 10, botiga: 1 },
    })
    const merged = mergeProgress(data(local), data(incoming), 'keep-newer').world
    expect(merged).toMatchObject({ owned: ['llum', 'sofa'], pets: ['melo', 'nyx'], petalsSpent: 9, avatarUpdatedAt: 8 })
    expect(merged?.avatar.top.item).toBe('jersei')
    expect(merged?.placed).toEqual({ casa: [sofa('a')], botiga: [sofa('c')] })
    expect(mergeProgress(data(null), data(incoming), 'keep-newer').world).toEqual(incoming)
    expect(mergeProgress(data(local), data(null), 'keep-newer').world).toEqual(local)
    expect(mergeProgress({ ...data(local), world: undefined }, { ...data(null), world: undefined }, 'keep-newer').world).toEqual(null)
  })

  it('keep-newer import writes the merged town', async () => {
    await db.profile.put(PROFILE)
    await db.world.put(world({ owned: ['llum'], petalsSpent: 2 }))
    const file = { ...(await exportProgress()), world: world({ owned: ['sofa'], petalsSpent: 7 }) }
    expect((await importProgress(serializeBackup(file), { strategy: 'keep-newer' })).ok).toBe(true)
    expect(await db.world.get('world')).toMatchObject({ owned: ['llum', 'sofa'], petalsSpent: 7 })
  })
})
