import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../../core/progress/store'
import type { MatesDb } from '../../core/storage/db'
import { openPlayerDb } from '../../core/storage/playerDbs'
import { emitWorldStored } from '../../core/storage/worldRow'
import { onProgressChanged } from '../../core/sync/progressEvents'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import type { CatalogEntry } from '../model/types'
import { defaultAvatar } from '../characters/wearables'
import { catalogEntries, registerCatalog, resetCatalogForTest } from './catalog'
import { adoptPet, buyItem, currentCoins, grantCoins, grantItem, loadWorld, movePlaced, placeItem, removePlaced, resetWorldStoreForTest, saveAvatar, useWorldStore } from './worldStore'

const SOFA: CatalogEntry = { id: 'sofa', kind: 'furniture', name: 'Sofà', price: 20, scene: 'casa' }
const GAT: CatalogEntry = { id: 'gat-gris', kind: 'pet', name: 'Gat', price: 5 }
const answer = { skillId: 'A1', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }
const store = () => useProgress.getState()
const dbOfActive = (): MatesDb => {
  const p = store().players.find((x) => x.id === store().activePlayerId)
  if (!p) throw new Error('no player')
  return openPlayerDb(p.dbName)
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  resetWorldStoreForTest()
  registerCatalog([SOFA, GAT])
})
afterEach(async () => {
  resetCatalogForTest()
  await wipeAllDatabases()
})

describe('loading', () => {
  it('creates the world row lazily on first read, with the avatar from the profile', async () => {
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    expect(await dbOfActive().world.count()).toBe(0)
    const row = await loadWorld()
    expect(row?.avatar).toEqual(defaultAvatar('mixa', 'menta'))
    expect(await dbOfActive().world.get('world')).toEqual(row)
    expect(useWorldStore.getState()).toMatchObject({ status: 'ready', row })
  })

  it('nobody playing: nothing is loaded and actions say no-player', async () => {
    expect(await loadWorld()).toBeUndefined()
    expect(await buyItem(SOFA)).toEqual({ ok: false, reason: 'no-player' })
    expect(await grantCoins(3, 'encarrec')).toBe(false)
  })

  it('a player switch empties the memory; the next read is the other player', async () => {
    const a = await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    await loadWorld()
    await store().createPlayer({ name: 'Pau', character: 'blau', color: 'blau' })
    expect(useWorldStore.getState()).toMatchObject({ status: 'idle', row: undefined })
    expect((await loadWorld())?.avatar).toEqual(defaultAvatar('blau', 'blau'))
    await store().selectPlayer(a)
    expect((await loadWorld())?.avatar).toEqual(defaultAvatar('mixa', 'menta'))
  })

  it('reloads when the row is rewritten elsewhere (sync pull, restore) for the active player', async () => {
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    const row = (await loadWorld())!
    await dbOfActive().world.put({ ...row, owned: ['sofa'] })
    emitWorldStored(dbOfActive().name)
    await loadWorld() // queued after the reload triggered by the event
    expect(useWorldStore.getState().row?.owned).toEqual(['sofa'])
  })
})

describe('coins and buying', () => {
  beforeEach(async () => {
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
  })

  it('grantCoins adds petals (monedes) through the progress store', async () => {
    let changes = 0
    const off = onProgressChanged(() => (changes += 1))
    expect(await grantCoins(7, 'botiga:suma')).toBe(true)
    off()
    expect(store().rewards.petals).toBe(7)
    expect(currentCoins()).toBe(7)
    expect(useWorldStore.getState().lastGrant).toMatchObject({ amount: 7, reason: 'botiga:suma' })
    expect(changes).toBeGreaterThan(0)
    expect(await grantCoins(0, 'x')).toBe(false)
    expect(await grantCoins(2, '')).toBe(false)
  })

  it('buy deducts coins (via petalsSpent, petals stay earned), persists and is idempotent', async () => {
    await grantCoins(25, 'test')
    expect(await buyItem(SOFA)).toMatchObject({ ok: true, charged: 20 })
    expect(currentCoins()).toBe(5)
    expect(store().rewards.petals).toBe(25)
    expect(await dbOfActive().world.get('world')).toMatchObject({ owned: ['sofa'], petalsSpent: 20 })
    expect(await buyItem(SOFA)).toMatchObject({ ok: true, charged: 0 })
    expect(await buyItem(GAT)).toMatchObject({ ok: true, charged: 5 })
    expect(await buyItem({ ...SOFA, id: 'catifa' })).toEqual({ ok: false, reason: 'unknown-item' })
    expect(currentCoins()).toBe(0)
  })

  it('never goes negative, even with quick taps racing the answers', async () => {
    await grantCoins(20, 'test')
    const results = await Promise.all([buyItem(SOFA), store().record(answer), buyItem(GAT), buyItem(GAT)])
    // sofa 20 first; the answer brings 3 coins; then the cat (5) cannot be afforded.
    expect(results[0]).toMatchObject({ ok: true })
    expect(results[2]).toEqual({ ok: false, reason: 'not-enough-coins' })
    expect(currentCoins()).toBe(3)
    expect((await dbOfActive().world.get('world'))?.petalsSpent).toBe(20)
  })

  it('a storage failure keeps the purchase in memory and warns the adult', async () => {
    await grantCoins(30, 'test')
    await loadWorld()
    const db = dbOfActive()
    const original = db.world.put.bind(db.world)
    db.world.put = (() => Promise.reject(new Error('ple'))) as unknown as typeof db.world.put
    try {
      expect(await buyItem(SOFA)).toMatchObject({ ok: true })
    } finally {
      db.world.put = original
    }
    expect(store().storageError).toBe(true)
    expect(currentCoins()).toBe(10)
  })
})

describe('avatar, placements and pets', () => {
  beforeEach(async () => {
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    await grantCoins(100, 'test')
    await buyItem(SOFA)
  })

  it('saveAvatar validates and persists', async () => {
    const row = (await loadWorld())!
    const spec = { ...row.avatar, top: { item: row.avatar.top.item, color: 'coral' as const } }
    expect(await saveAvatar(spec)).toMatchObject({ ok: true })
    expect((await dbOfActive().world.get('world'))?.avatar).toEqual(spec)
    expect(await saveAvatar({ ...spec, accessory: { item: 'corona', color: 'mango' } })).toEqual({ ok: false, reason: 'not-owned' })
  })

  it('place, move and remove persist per scene', async () => {
    expect(await placeItem('casa', { uid: 'u1', item: 'sofa', x: 0.1, y: 0.2, z: 0 })).toMatchObject({ ok: true })
    expect(await movePlaced('casa', 'u1', { x: 0.7 })).toMatchObject({ ok: true })
    expect((await dbOfActive().world.get('world'))?.placed.casa).toEqual([{ uid: 'u1', item: 'sofa', x: 0.7, y: 0.2, z: 0 }])
    expect(await removePlaced('casa', 'u1')).toMatchObject({ ok: true })
    expect((await dbOfActive().world.get('world'))?.placed.casa).toEqual([])
  })

  it('adopt needs the pet bought first', async () => {
    expect(await adoptPet('gat-gris')).toEqual({ ok: false, reason: 'not-owned' })
    await buyItem(GAT)
    expect(await adoptPet('gat-gris')).toMatchObject({ ok: true })
    expect(useWorldStore.getState().row?.pets).toEqual(['gat-gris'])
  })
})

describe('grantItem (surprise gifts)', () => {
  it('gives the item for free, persisted, and keeps the coins spent as they were', async () => {
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    await grantCoins(30, 'test')
    await buyItem(SOFA)
    const result = await grantItem('corona', 'tauler:2026-10-09')
    expect(result.ok).toBe(true)
    const row = await dbOfActive().world.get('world')
    expect(row?.owned).toEqual(['corona', 'sofa'])
    expect(row?.petalsSpent).toBe(20)
    expect(currentCoins()).toBe(10)
    expect(useWorldStore.getState().row?.owned).toContain('corona')
  })

  it('refuses a bad reason, an unknown item, and nobody playing', async () => {
    expect(await grantItem('corona', 'x')).toEqual({ ok: false, reason: 'no-player' })
    await store().createPlayer({ name: 'Laia', character: 'mixa', color: 'menta' })
    expect(await grantItem('corona', '  ')).toEqual({ ok: false, reason: 'invalid' })
    expect(await grantItem('no-existeix', 'tauler')).toEqual({ ok: false, reason: 'unknown-item' })
  })
})

describe('catalogEntries', () => {
  it('lists the wearables and what places registered', () => {
    const ids = catalogEntries().map((e) => e.id)
    expect(ids).toContain('corona')
    expect(ids).toContain('sofa')
  })
})
