import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { hasAccountHint } from './accountHint'
import { configureAccount, restoreSessionAtStart, useAccount } from './accountStore'
import { createFakeServer, type FakeServer } from './fakeServer.testutil'

let server: FakeServer
beforeEach(async () => {
  localStorage.clear()
  await wipeAllDatabases()
  resetStoreForTest()
  server = createFakeServer()
  server.setAuthed(false)
  configureAccount({ fetch: server.fetch, autoSync: false })
})
afterEach(() => localStorage.clear())

describe('start-up session check', () => {
  it('never contacts the server on a device that never logged in', async () => {
    await restoreSessionAtStart()
    expect(server.calls).toEqual([])
    expect(useAccount.getState().status).toBe('loggedOut')
  })

  it('login sets the hint (no email in it); logout and expired sessions clear it', async () => {
    await useAccount.getState().login('familia@exemple.cat', 'contrasenya-llarga')
    expect(hasAccountHint()).toBe(true)
    expect(JSON.stringify({ ...localStorage })).not.toContain('familia')
    await restoreSessionAtStart()
    expect(server.calls.at(-1)?.path).toBe('/api/auth/me')
    expect(useAccount.getState().status).toBe('loggedIn')
    server.setAuthed(false)
    await restoreSessionAtStart()
    expect(useAccount.getState().status).toBe('loggedOut')
    expect(hasAccountHint()).toBe(false)
  })

  it('logout clears the hint', async () => {
    await useAccount.getState().login('familia@exemple.cat', 'contrasenya-llarga')
    await useAccount.getState().logout()
    expect(hasAccountHint()).toBe(false)
  })
})
