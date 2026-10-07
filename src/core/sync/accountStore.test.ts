import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { openPlayerDb } from '../storage/playerDbs'
import { configureAccount, useAccount } from './accountStore'
import { createFakeServer, type FakeServer } from './fakeServer.testutil'
import { readSyncState } from './syncState'

const PW = 'contrasenya-llarga'
const account = () => useAccount.getState()
let server: FakeServer

async function localPlayer(): Promise<string> {
  const id = await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
  await useProgress.getState().record({ skillId: 'A1', correct: true, rtMs: 900, hintsUsed: 0, cpaStage: 'concret', gameId: 'repte-illa' })
  return id
}

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  server = createFakeServer()
  server.setAuthed(false)
  configureAccount({ fetch: server.fetch, autoSync: false })
})
afterEach(async () => {
  configureAccount({ fetch: server.fetch, autoSync: false })
  await wipeAllDatabases()
})

describe('restore session (GET /api/auth/me)', () => {
  it('logged in, logged out or offline', async () => {
    server.setAuthed(true)
    await account().restore()
    expect(account()).toMatchObject({ status: 'loggedIn', email: 'familia@exemple.cat' })
    configureAccount({ fetch: server.fetch, autoSync: false })
    server.setAuthed(false)
    await account().restore()
    expect(account()).toMatchObject({ status: 'loggedOut', email: undefined })
    server.intercept(() => new TypeError('offline'))
    await account().restore()
    expect(account().status).toBe('offline')
  })
})

describe('register and login', () => {
  it('wrong invite code and weak password give friendly Catalan messages', async () => {
    expect(await account().register('a@b.cat', PW, 'DOLENT')).toEqual({ ok: false, message: expect.stringMatching(/codi d’invitació/) })
    expect(await account().register('a@b.cat', 'una-feble', 'BON-CODI')).toEqual({ ok: false, message: expect.stringMatching(/10 caràcters/) })
    expect(account().status).toBe('loggedOut')
  })

  it('register logs in and the first sync uploads the local players', async () => {
    const id = await localPlayer()
    expect(await account().register('familia@exemple.cat', PW, 'BON-CODI')).toEqual({ ok: true })
    expect(account()).toMatchObject({ status: 'loggedIn', email: 'familia@exemple.cat' })
    expect(await account().syncNow()).toBe(true)
    expect(account().lastSyncAt).toBeGreaterThan(0)
    expect(account().players[id]).toEqual({ state: 'idle', skipped: 0, quarantined: 0 })
    expect(server.profiles.has(id)).toBe(true)
  })

  it('login: wrong then right password', async () => {
    expect(await account().login('familia@exemple.cat', 'no')).toEqual({ ok: false, message: expect.stringMatching(/contrasenya no són correctes/) })
    expect(await account().login('familia@exemple.cat', PW)).toEqual({ ok: true })
    expect(account().status).toBe('loggedIn')
  })

  it('never keeps the password or the email in persistent storage', async () => {
    await account().login('familia@exemple.cat', PW)
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/familia|contrasenya/)
    expect(JSON.stringify(account())).not.toContain(PW)
  })
})

describe('sync status', () => {
  it('401 during sync: logged out, local progress kept', async () => {
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    server.setAuthed(false)
    expect(await account().syncNow()).toBe(false)
    expect(account().status).toBe('loggedOut')
    expect(account().message).toMatch(/sessió ha caducat/)
    expect(await openPlayerDb(`mates-magiques-${id}`).attempts.count()).toBe(1)
  })

  it('offline while logged in, then back', async () => {
    await localPlayer()
    await account().login('familia@exemple.cat', PW)
    server.intercept(() => new TypeError('offline'))
    expect(await account().syncNow()).toBe(false)
    expect(account().status).toBe('offline')
    expect(await account().syncNow()).toBe(true)
    expect(account().status).toBe('loggedIn')
  })

  it('a per-player error (quota) shows on that player only', async () => {
    const quota = createFakeServer({ maxDocs: 1 })
    configureAccount({ fetch: quota.fetch, autoSync: false })
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    expect(await account().syncNow()).toBe(true)
    expect(account().players[id]).toMatchObject({ state: 'error', message: expect.stringMatching(/límit/) })
  })

  it('counts skipped items per player', async () => {
    const id = await localPlayer()
    await openPlayerDb(`mates-magiques-${id}`).factStates.put({ factKey: 'bad key', box: 0, streak: 0, attempts: 1, correct: 0, recentRts: [], lastSeen: Date.now() + 1000, dueAt: 0 })
    await account().login('familia@exemple.cat', PW)
    await account().syncNow()
    expect(account().players[id]).toMatchObject({ state: 'idle', skipped: 1 })
  })
})

describe('account actions', () => {
  it('logout keeps every local player and their progress', async () => {
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    await account().syncNow()
    await account().logout()
    expect(account()).toMatchObject({ status: 'loggedOut', email: undefined, players: {} })
    expect(useProgress.getState().players.map((p) => p.id)).toEqual([id])
  })

  it('change password: wrong current, weak new, ok', async () => {
    await account().login('familia@exemple.cat', PW)
    expect(await account().changePassword('x', 'una altra llarga')).toMatchObject({ ok: false, message: expect.stringMatching(/contrasenya no és correcta/) })
    expect(await account().changePassword(PW, 'molt-feble-1')).toMatchObject({ ok: false, message: expect.stringMatching(/10 caràcters/) })
    expect(await account().changePassword(PW, 'una altra llarga')).toEqual({ ok: true })
  })

  it('delete account: wrong password refused; then server data gone, local progress stays, cursors reset', async () => {
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    await account().syncNow()
    expect(await account().deleteAccount('x')).toMatchObject({ ok: false })
    expect(await account().deleteAccount(PW)).toEqual({ ok: true })
    expect(account().status).toBe('loggedOut')
    expect(server.profiles.size).toBe(0)
    const db = openPlayerDb(`mates-magiques-${id}`)
    expect(await db.attempts.count()).toBe(1)
    expect(await readSyncState(db)).toMatchObject({ syncSeq: 0, lastPushedAt: 0 })
  })

  it('logging into another family resets the local sync cursors', async () => {
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    await account().syncNow()
    await account().logout()
    server.setFamilyId('familia-2')
    await account().login('familia@exemple.cat', PW)
    expect((await readSyncState(openPlayerDb(`mates-magiques-${id}`))).syncSeq).toBe(0)
  })

  it('forgetPlayer purges the profile on the server when logged in', async () => {
    const id = await localPlayer()
    await account().login('familia@exemple.cat', PW)
    await account().syncNow()
    await useProgress.getState().deletePlayer(id)
    await account().forgetPlayer(id)
    expect(server.profiles.has(id)).toBe(false)
  })
})
