import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { newSkillState } from '../engine/mastery'
import { useProgress } from '../progress/store'
import { openPlayerDb } from '../storage/playerDbs'
import { readPlayers } from '../storage/registry'
import { ApiError, createApi } from './api'
import { createSyncEngine } from './engine'
import { createFakeServer, type FakeServer } from './fakeServer.testutil'
import { readPendingDeletes } from './pendingDeletes'
import { readSyncState } from './syncState'

const LAIA = { name: 'Laia', character: 'nyx', color: 'rosa' } as const
const answer = { skillId: 'A4', factKey: 'add:2+3', correct: true, rtMs: 1000, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const }

const store = () => useProgress.getState()
const dbOf = (id: string) => openPlayerDb(store().players.find((p) => p.id === id)?.dbName ?? `mates-magiques-${id}`)

let server: FakeServer
const engineFor = (s: FakeServer) => createSyncEngine({ api: createApi({ fetch: s.fetch }) })
/** Lets the clock move so 'changed since the last push' is unambiguous. */
const tick = () => new Promise((r) => setTimeout(r, 3))

async function playerWithProgress(): Promise<string> {
  const id = await store().createPlayer(LAIA)
  await store().finishDiagnostic({ A1: { mastery: 0.7, status: 'consolidant' } })
  await store().record(answer)
  await store().record({ ...answer, correct: false })
  await store().grantSticker()
  await tick()
  return id
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  server = createFakeServer()
})
afterEach(wipeAllDatabases)

describe('syncPlayer: first and incremental sync', () => {
  it('creates the server profile, pushes every doc and attempt and advances the cursors', async () => {
    const id = await playerWithProgress()
    const result = await engineFor(server).syncPlayer(id)
    expect(result).toEqual({ skipped: 0, quarantined: 0 })
    expect(server.profiles.get(id)).toMatchObject({ name: 'Laia', character: 'nyx', color: 'rosa' })
    const kinds = server.docsOf(id).map((d) => `${d.kind}:${d.key}`).sort()
    expect(kinds).toEqual(['fact:add:2+3', 'rewards:me', 'settings:profile', 'skill:A1', 'skill:A4'])
    expect(server.attemptsOf(id)).toHaveLength(2)
    const state = await readSyncState(dbOf(id))
    expect(state.syncSeq).toBeGreaterThan(0)
    expect(state.lastPushedAt).toBeGreaterThan(0)
  })

  it('a second sync without changes sends nothing; a new answer sends only what changed', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await engine.syncPlayer(id)
    const before = server.calls.length
    await tick()
    await engine.syncPlayer(id)
    const quiet = server.syncCalls().at(-1)?.body as { push: { docs: unknown[]; attempts: unknown[] } }
    expect(quiet.push).toEqual({ docs: [], attempts: [] })
    expect(server.calls.length - before).toBe(1)

    await store().record({ ...answer, skillId: 'A1', factKey: undefined })
    await tick()
    await engine.syncPlayer(id)
    const push = server.syncCalls().at(-1)?.body as { push: { docs: { key: string }[] } }
    expect(push.push.docs.map((d) => d.key).sort()).toEqual(['A1', 'me'])
    expect(server.attemptsOf(id)).toHaveLength(3)
  })

  it('backfills a missing skill updatedAt from its latest attempt', async () => {
    const id = await playerWithProgress()
    const db = dbOf(id)
    const { updatedAt: _u, ...old } = (await db.skillStates.get('A4'))!
    await db.skillStates.put(old)
    const latest = (await db.attempts.where('skillId').equals('A4').sortBy('createdAt')).at(-1)!.createdAt
    await engineFor(server).syncPlayer(id)
    expect((await db.skillStates.get('A4'))?.updatedAt).toBe(latest)
    expect(server.docsOf(id).find((d) => d.key === 'A4')?.updatedAt).toBe(latest)
  })

  it('pages the pull while hasMore', async () => {
    const id = await playerWithProgress()
    const small = createFakeServer({ pageSize: 2 })
    await engineFor(small).syncPlayer(id)
    // 5 docs + 2 attempts (only hidden from the push's own answer, like the real server) in pages of 2.
    expect(small.syncCalls().length).toBe(4)
    const last = small.syncCalls().at(-1)?.body as { since: number }
    expect(last.since).toBeGreaterThan(0)
    expect((await readSyncState(dbOf(id))).syncSeq).toBe(Math.max(...small.docsOf(id).map((d) => d.seq), ...small.attemptsOf(id).map((a) => a.seq)))
  })
})

describe('bad items never block sync', () => {
  it('skips and counts local rows that fail the server schema (never sent)', async () => {
    const id = await playerWithProgress()
    await dbOf(id).skillStates.put({ ...newSkillState('zz'), updatedAt: 5 })
    const result = await engineFor(server).syncPlayer(id)
    expect(result.skipped).toBe(1)
    expect(server.docsOf(id).some((d) => d.key === 'zz')).toBe(false)
  })

  it('bisects a 422 push to quarantine the offending doc and sends the rest', async () => {
    const id = await playerWithProgress()
    server.poison.add('A1')
    const result = await engineFor(server).syncPlayer(id)
    expect(result.quarantined).toBe(1)
    expect(server.docsOf(id).map((d) => d.key).sort()).toEqual(['A4', 'add:2+3', 'me', 'profile'])
    expect((await readSyncState(dbOf(id))).quarantine).toEqual([expect.stringMatching(/^skill:A1@/)])
    const calls = server.syncCalls().length
    await tick()
    await engineFor(server).syncPlayer(id)
    expect(server.syncCalls().length - calls).toBe(1)
  })

  it('quarantines a rejected attempt', async () => {
    const id = await playerWithProgress()
    const [first] = await dbOf(id).attempts.toArray()
    server.poison.add(first!.id)
    const result = await engineFor(server).syncPlayer(id)
    expect(result.quarantined).toBe(1)
    expect(server.attemptsOf(id)).toHaveLength(1)
  })
})

describe('failures', () => {
  it('401: rejects with unauthorized and keeps cursors and local data', async () => {
    const id = await playerWithProgress()
    server.setAuthed(false)
    await expect(engineFor(server).syncAll()).rejects.toMatchObject({ status: 401 })
    expect(await readSyncState(dbOf(id))).toMatchObject({ syncSeq: 0, lastPushedAt: 0 })
    expect(await dbOf(id).attempts.count()).toBe(2)
  })

  it('429 surfaces Retry-After; network errors reject; cursors advance only after success', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    server.intercept(() => undefined, () => server.json(429, { error: 'rate_limited' }, { 'Retry-After': '7' }))
    await expect(engine.syncPlayer(id)).rejects.toMatchObject({ status: 429, retryAfterMs: 7000 })
    expect((await readSyncState(dbOf(id))).lastPushedAt).toBe(0)
    server.intercept(() => new TypeError('offline'))
    await expect(engine.syncPlayer(id)).rejects.toMatchObject({ status: 0, code: 'network' })
    expect((await readSyncState(dbOf(id))).lastPushedAt).toBe(0)
    await engine.syncPlayer(id)
    expect((await readSyncState(dbOf(id))).lastPushedAt).toBeGreaterThan(0)
  })

  it('409 quota_exceeded is reported per player by syncAll, others continue', async () => {
    const quota = createFakeServer({ maxDocs: 2 })
    await playerWithProgress()
    const result = await engineFor(quota).syncAll()
    const [entry] = Object.values(result.players)
    expect(entry).toMatchObject({ error: expect.any(ApiError) })
    expect(entry && 'error' in entry && entry.error.code).toBe('quota_exceeded')
  })
})

describe('concurrency', () => {
  it('coalesces overlapping calls: one run plus at most one rerun', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await Promise.all([engine.syncPlayer(id), engine.syncPlayer(id), engine.syncPlayer(id)])
    const puts = server.calls.filter((c) => c.method === 'PUT').length
    expect(puts).toBe(1)
    expect(server.syncCalls().length).toBeLessThanOrEqual(2)
  })
})

describe('pull side', () => {
  it('a player that only exists on the server is created locally (same uuid) with its progress', async () => {
    const id = await playerWithProgress()
    const petals = store().rewards.petals
    await engineFor(server).syncAll()
    // "Another device": nothing local.
    await wipeAllDatabases()
    resetStoreForTest()
    await engineFor(server).syncAll()
    const { players } = await readPlayers()
    expect(players).toEqual([expect.objectContaining({ id, name: 'Laia', character: 'nyx', color: 'rosa' })])
    expect(store().players.map((p) => p.id)).toEqual([id])
    const db = dbOf(id)
    expect((await db.rewards.get('me'))?.petals).toBe(petals)
    expect(await db.attempts.count()).toBe(2)
    expect((await db.profile.get('me'))?.diagnosticDone).toBe(true)
    expect((await db.skillStates.get('A4'))?.attempts).toBe(2)
  })

  it('refreshes the store of the active player with remote changes', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await engine.syncPlayer(id)
    const remote = server.docsOf(id).find((d) => d.kind === 'rewards')!
    const api = createApi({ fetch: server.fetch })
    await api.sync(id, { since: 0, push: { docs: [{ kind: 'rewards', key: 'me', data: { ...(remote.data as object), petals: 500 } as never, updatedAt: Date.now() + 5_000 }], attempts: [] } })
    await engine.syncPlayer(id)
    expect(store().rewards.petals).toBe(500)
    expect((await dbOf(id).rewards.get('me'))?.petals).toBe(500)
  })

  it('adopts a rename made on another device, and pushes a local rename', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await engine.syncAll()
    server.profiles.set(id, { ...server.profiles.get(id)!, name: 'Laieta' })
    await engine.syncAll()
    expect(store().players[0]?.name).toBe('Laieta')
    expect((await dbOf(id).profile.get('me'))?.name).toBe('Laieta')
    await store().renamePlayer(id, { name: 'Lali' })
    await engine.syncAll()
    expect(server.profiles.get(id)?.name).toBe('Lali')
  })

  it('local delete: purges on the server, remembers it while offline and flushes later', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await engine.syncAll()
    await store().deletePlayer(id)
    server.intercept(() => new TypeError('offline'))
    await engine.deleteRemotePlayer(id)
    expect(await readPendingDeletes()).toEqual([id])
    await engine.syncAll()
    expect(server.calls.some((c) => c.method === 'DELETE' && c.path.endsWith(`${id}?purge=true`))).toBe(true)
    expect(server.profiles.has(id)).toBe(false)
    expect(await readPendingDeletes()).toEqual([])
    expect(store().players).toEqual([])
  })

  it('a player deleted from the account elsewhere is detached here, not uploaded again (local progress kept)', async () => {
    const id = await playerWithProgress()
    const engine = engineFor(server)
    await engine.syncAll()
    server.profiles.delete(id)
    const result = await engine.syncAll()
    expect(result.players[id]).toEqual({ skipped: 0, quarantined: 0, detached: true })
    expect(server.profiles.has(id)).toBe(false)
    expect(server.calls.filter((c) => c.method === 'PUT')).toHaveLength(1)
    expect(await dbOf(id).attempts.count()).toBe(2)
    expect((await readSyncState(dbOf(id))).detached).toBe(true)
  })

  it('a 404 for the profile also detaches the player', async () => {
    const id = await playerWithProgress()
    server.intercept(() => server.json(404, { error: 'not_found' }))
    await expect(engineFor(server).syncPlayer(id)).resolves.toEqual({ skipped: 0, quarantined: 0, detached: true })
  })
})

