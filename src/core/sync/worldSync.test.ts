import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { openPlayerDb } from '../storage/playerDbs'
import { coinsOf, onWorldStored, type WorldRow } from '../storage/worldRow'
import { createApi } from './api'
import { createSyncEngine } from './engine'
import { createFakeServer, type FakeServer } from './fakeServer.testutil'
import { normalizeWorld } from './mergeWorld'
import { readSyncState } from './syncState'

const LAIA = { name: 'Laia', character: 'nyx', color: 'rosa' } as const
const answer = { skillId: 'A4', factKey: 'add:2+3', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }

const store = () => useProgress.getState()
const dbOf = (id: string) => openPlayerDb(store().players.find((p) => p.id === id)?.dbName ?? `mates-magiques-${id}`)
const tick = () => new Promise((r) => setTimeout(r, 3))

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

let server: FakeServer
const engineFor = (s: FakeServer) => createSyncEngine({ api: createApi({ fetch: s.fetch }) })
type PushBody = { push: { docs: { kind: string; data: unknown }[] } }
const lastPushedKinds = () => ((server.syncCalls().at(-1)?.body as PushBody | undefined)?.push.docs ?? []).map((d) => d.kind)
const serverWorld = (id: string) => server.docsOf(id).find((d) => d.kind === 'world')

async function playerWithWorld(row: WorldRow): Promise<string> {
  const id = await store().createPlayer(LAIA)
  await store().record(answer)
  await dbOf(id).world.put(row)
  await tick()
  return id
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  server = createFakeServer()
})
afterEach(wipeAllDatabases)

describe('world doc sync', () => {
  it('a player without a world row pushes no world doc (unchanged behaviour)', async () => {
    const id = await store().createPlayer(LAIA)
    await engineFor(server).syncPlayer(id)
    expect(serverWorld(id)).toBeUndefined()
  })

  it('pushes the world doc once, then only when it changes', async () => {
    const id = await playerWithWorld(world({ owned: ['sofa'], petalsSpent: 3 }))
    const engine = engineFor(server)
    await engine.syncPlayer(id)
    expect(serverWorld(id)?.data).toEqual(normalizeWorld(world({ owned: ['sofa'], petalsSpent: 3 })))
    await tick()
    await engine.syncPlayer(id)
    expect(lastPushedKinds()).toEqual([])
    await dbOf(id).world.put(world({ owned: ['sofa', 'llum'], petalsSpent: 9 }))
    await tick()
    await engine.syncPlayer(id)
    expect(lastPushedKinds()).toEqual(['world'])
    expect(serverWorld(id)?.data).toMatchObject({ owned: ['llum', 'sofa'], petalsSpent: 9 })
  })

  it('merges a remote world doc into the local row and announces it', async () => {
    const id = await playerWithWorld(world({ owned: ['sofa'], petalsSpent: 5, placed: { casa: [{ uid: 'a', item: 'sofa', x: 0.1, y: 0.2, z: 1 }] }, placedAt: { casa: 10 } }))
    const engine = engineFor(server)
    await engine.syncPlayer(id)
    const remote = world({
      owned: ['catifa'],
      pets: ['melo'],
      petalsSpent: 2,
      avatarUpdatedAt: 50,
      avatar: { ...world().avatar, top: { item: 'jersei', color: 'menta' } },
      placed: { casa: [{ uid: 'b', item: 'catifa', x: 0.5, y: 0.5, z: 0 }] },
      placedAt: { casa: 20 },
    })
    await createApi({ fetch: server.fetch }).sync(id, { since: 0, push: { docs: [{ kind: 'world', key: 'world', data: remote, updatedAt: Date.now() + 1 }], attempts: [] } })
    const announced: string[] = []
    const off = onWorldStored((name) => announced.push(name))
    await engine.syncPlayer(id)
    off()
    const local = await dbOf(id).world.get('world')
    expect(local).toMatchObject({ owned: ['catifa', 'sofa'], pets: ['melo'], petalsSpent: 5, avatarUpdatedAt: 50 })
    expect(local?.avatar.top.item).toBe('jersei')
    expect(local?.placed.casa?.map((p) => p.uid)).toEqual(['b'])
    expect(announced).toEqual([dbOf(id).name])
    // The snapshot is the server version: the merged local row (the same here) is not re-sent.
    expect((await readSyncState(dbOf(id))).syncedWorld).toBe(JSON.stringify(normalizeWorld(serverWorld(id)!.data as WorldRow)))
  })

  it('a world doc pulled for a fresh device is stored as is', async () => {
    const id = await playerWithWorld(world({ owned: ['sofa'] }))
    await engineFor(server).syncAll()
    await wipeAllDatabases()
    resetStoreForTest()
    await engineFor(server).syncAll()
    expect(await dbOf(id).world.get('world')).toEqual(normalizeWorld(world({ owned: ['sofa'] })))
  })

  it('spending on one device is never undone by the max-merge of rewards from another device', async () => {
    const id = await playerWithWorld(world())
    const engine = engineFor(server)
    await engine.syncPlayer(id)
    // Device B earned more meanwhile: the server keeps the max petals (30).
    const remoteRewards = server.docsOf(id).find((d) => d.kind === 'rewards')!
    await createApi({ fetch: server.fetch }).sync(id, {
      since: 0,
      push: { docs: [{ kind: 'rewards', key: 'me', data: { ...(remoteRewards.data as object), petals: 30 } as never, updatedAt: Date.now() + 1 }], attempts: [] },
    })
    // Device A (here) spends 3 coins: petals stay "earned", petalsSpent grows.
    const mine = (await dbOf(id).world.get('world'))!
    await dbOf(id).world.put({ ...mine, owned: ['sofa'], petalsSpent: 3 })
    await tick()
    await engine.syncPlayer(id)
    const petals = (await dbOf(id).rewards.get('me'))!.petals
    const spent = (await dbOf(id).world.get('world'))!.petalsSpent
    expect(petals).toBe(30)
    expect(coinsOf(petals, spent)).toBe(27)
    expect(serverWorld(id)?.data).toMatchObject({ petalsSpent: 3, owned: ['sofa'] })
  })

  it('an invalid world doc from the server is counted and never written', async () => {
    const id = await playerWithWorld(world({ owned: ['sofa'] }))
    await engineFor(server).syncPlayer(id)
    server.intercept(() =>
      server.json(200, { seq: 99, docs: [{ kind: 'world', key: 'world', data: { ...world(), owned: ['Not Valid'] }, updatedAt: 1, seq: 99 }], attempts: [], hasMore: false }),
    )
    await tick()
    await dbOf(id).world.put(world({ owned: ['sofa', 'llum'] }))
    const result = await engineFor(server).syncPlayer(id)
    expect(result.skipped).toBe(1)
    expect((await dbOf(id).world.get('world'))?.owned).toEqual(['sofa', 'llum'])
  })
})
