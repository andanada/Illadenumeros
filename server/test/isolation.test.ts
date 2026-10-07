import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { attemptPush, createProfile, makeApp, profileBody, registerFamily, skillDoc, type Client, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

interface World {
  a: Client
  b: Client
  profileA: string
  profileB: string
}

async function world(): Promise<World> {
  t = await makeApp()
  const { http: a } = await registerFamily(t.app, 'a@example.com')
  const { http: b } = await registerFamily(t.app, 'b@example.com')
  const profileA = await createProfile(a, 'Alice')
  const profileB = await createProfile(b, 'Bruno')
  await a.request('POST', `/api/profiles/${profileA}/sync`, { since: 0, push: { docs: [skillDoc('A1', { mastery: 0.77 })], attempts: [attemptPush()] } })
  return { a, b, profileA, profileB }
}

const countA = (w: World): { docs: number; attempts: number; profiles: number } => {
  const q = (sql: string): number => (t!.ctx.db.prepare(sql).get(w.profileA) as { n: number }).n
  return {
    docs: q('SELECT COUNT(*) n FROM docs WHERE profile_id = ?'),
    attempts: q('SELECT COUNT(*) n FROM attempts WHERE profile_id = ?'),
    profiles: q('SELECT COUNT(*) n FROM profiles WHERE id = ? AND deleted_at IS NULL'),
  }
}

describe('family isolation matrix: B can never touch A', () => {
  it('GET /api/profiles lists only own profiles', async () => {
    const w = await world()
    const list = (await w.b.request('GET', '/api/profiles')).json().profiles
    expect(list.map((p: { id: string }) => p.id)).toEqual([w.profileB])
    expect(JSON.stringify(list)).not.toContain('Alice')
  })

  it('GET /api/auth/me shows only own data', async () => {
    const w = await world()
    const me = (await w.b.request('GET', '/api/auth/me')).json()
    expect(JSON.stringify(me)).not.toContain(w.profileA)
    expect(me.family.email).toBe('b@example.com')
  })

  it('PUT on a foreign id answers 404 and changes nothing (no hijacking by uuid)', async () => {
    const w = await world()
    const res = await w.b.request('PUT', `/api/profiles/${w.profileA}`, profileBody('Hacked'))
    expect(res.statusCode).toBe(404)
    const own = (await w.a.request('GET', '/api/profiles')).json().profiles[0]
    expect(own.name).toBe('Alice')
  })

  it('DELETE (soft and purge) on a foreign id answers 404 and deletes nothing', async () => {
    const w = await world()
    expect((await w.b.request('DELETE', `/api/profiles/${w.profileA}`)).statusCode).toBe(404)
    expect((await w.b.request('DELETE', `/api/profiles/${w.profileA}?purge=true`)).statusCode).toBe(404)
    expect(countA(w)).toEqual({ docs: 1, attempts: 1, profiles: 1 })
  })

  it('POST sync on a foreign id answers 404, for pulls and pushes', async () => {
    const w = await world()
    const pull = await w.b.request('POST', `/api/profiles/${w.profileA}/sync`, { since: 0 })
    expect(pull.statusCode).toBe(404)
    expect(pull.body).not.toContain('0.77')
    const push = await w.b.request('POST', `/api/profiles/${w.profileA}/sync`, { since: 0, push: { docs: [skillDoc('A9')], attempts: [attemptPush()] } })
    expect(push.statusCode).toBe(404)
    expect(countA(w)).toEqual({ docs: 1, attempts: 1, profiles: 1 })
  })

  it('GET export on a foreign id answers 404', async () => {
    const w = await world()
    const res = await w.b.request('GET', `/api/profiles/${w.profileA}/export`)
    expect(res.statusCode).toBe(404)
    expect(res.body).not.toContain('Alice')
  })

  it('account export and delete only concern the caller', async () => {
    const w = await world()
    const exp = (await w.b.request('GET', '/api/account/export')).json()
    expect(JSON.stringify(exp)).not.toContain(w.profileA)
    expect((await w.b.request('DELETE', '/api/account', { password: 'correct horse battery' })).statusCode).toBe(200)
    expect(countA(w)).toEqual({ docs: 1, attempts: 1, profiles: 1 })
    expect((await w.a.request('GET', '/api/auth/me')).statusCode).toBe(200)
  })

  it('unknown and foreign ids are indistinguishable (same status and body)', async () => {
    const w = await world()
    const foreign = await w.b.request('POST', `/api/profiles/${w.profileA}/sync`, { since: 0 })
    const unknown = await w.b.request('POST', `/api/profiles/${randomUUID()}/sync`, { since: 0 })
    const malformed = await w.b.request('POST', '/api/profiles/xyz/sync', { since: 0 })
    expect(foreign.statusCode).toBe(404)
    expect(unknown.statusCode).toBe(404)
    expect(malformed.statusCode).toBe(404)
    expect(foreign.body).toBe(unknown.body)
    expect(foreign.body).toBe(malformed.body)
  })

  it('B cannot reuse A attempt ids to read or overwrite A data (ids are scoped per profile)', async () => {
    const w = await world()
    const stolen = (t!.ctx.db.prepare('SELECT id, data FROM attempts').get() as { id: string; data: string })
    const forged = { ...attemptPush(stolen.id), data: { ...attemptPush().data, sessionId: 'forged' } }
    const mine = await w.b.request('POST', `/api/profiles/${w.profileB}/sync`, { since: 0, push: { attempts: [forged] } })
    expect(mine.statusCode).toBe(200)
    const rowA = t!.ctx.db.prepare('SELECT data FROM attempts WHERE profile_id = ? AND id = ?').get(w.profileA, stolen.id) as { data: string }
    expect(rowA.data).toBe(stolen.data) // A's attempt untouched
    const back = (await w.b.request('POST', `/api/profiles/${w.profileB}/sync`, { since: 0 })).json()
    // B only ever sees its own copy (L3: before, B's attempt was silently dropped because A owned the id).
    expect(back.attempts).toHaveLength(1)
    expect(back.attempts[0].data.sessionId).toBe('forged')
  })

  it('unauthenticated callers reach none of the protected endpoints', async () => {
    const w = await world()
    const anon = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) =>
      t!.app.inject({
        method,
        url,
        headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
        ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
      })
    const p = w.profileA
    const calls = [
      anon('GET', '/api/auth/me'),
      anon('POST', '/api/auth/change-password', { current: 'x', new: 'y'.repeat(12) }),
      anon('GET', '/api/profiles'),
      anon('PUT', `/api/profiles/${p}`, profileBody()),
      anon('DELETE', `/api/profiles/${p}`),
      anon('POST', `/api/profiles/${p}/sync`, { since: 0 }),
      anon('GET', `/api/profiles/${p}/export`),
      anon('GET', '/api/account/export'),
      anon('DELETE', '/api/account', { password: 'x' }),
    ]
    for (const res of await Promise.all(calls)) expect(res.statusCode).toBe(401)
  })
})
