import { afterEach, describe, expect, it } from 'vitest'
import { attemptPush, client, createProfile, makeApp, PASSWORD, registerFamily, skillDoc, skillIdAt, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

const n = (sql: string): number => (t!.ctx.db.prepare(sql).get() as { n: number }).n

describe('account export', () => {
  it('returns family, profiles with counts and export links', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app, 'me@example.com')
    const id = await createProfile(http, 'Melo')
    await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [skillDoc('A1')], attempts: [attemptPush(), attemptPush()] } })
    const res = await http.request('GET', '/api/account/export')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.family.email).toBe('me@example.com')
    expect(body.profiles[0]).toMatchObject({ id, name: 'Melo', counts: { docs: 1, attempts: 2 }, exportUrl: `/api/profiles/${id}/export` })
    expect(JSON.stringify(body)).not.toContain('argon2')
  })
})

describe('account deletion', () => {
  it('requires the right password', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    expect((await http.request('DELETE', '/api/account', { password: 'wrong-wrong-1' })).statusCode).toBe(403)
    expect((await http.request('DELETE', '/api/account', {})).statusCode).toBe(422)
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200)
  })

  it('hard deletes everything (even with thousands of attempts), logs out and frees the email', async () => {
    t = await makeApp()
    const { http, email } = await registerFamily(t.app, 'bye@example.com')
    const id = await createProfile(http)
    const other = await createProfile(http, 'Segon')
    for (let i = 0; i < 5; i++) {
      await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [skillDoc(skillIdAt(i))], attempts: Array.from({ length: 1000 }, () => attemptPush()) } })
    }
    await http.request('POST', `/api/profiles/${other}/sync`, { since: 0, push: { attempts: [attemptPush()] } })
    await http.request('DELETE', `/api/profiles/${other}`) // soft deleted profile must go too
    expect(n('SELECT COUNT(*) n FROM attempts')).toBe(5001)

    const started = Date.now()
    const res = await http.request('DELETE', '/api/account', { password: PASSWORD })
    expect(res.statusCode).toBe(200)
    expect(Date.now() - started).toBeLessThan(5000)
    for (const table of ['families', 'sessions', 'profiles', 'docs', 'attempts']) {
      expect(n(`SELECT COUNT(*) n FROM ${table}`)).toBe(0)
    }
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(401)
    const audit = t.ctx.db.prepare('SELECT event FROM audit ORDER BY id').all() as { event: string }[]
    expect(audit.map((a) => a.event)).toContain('delete_account')
    const again = await client(t.app).request('POST', '/api/auth/login', { email, password: PASSWORD })
    expect(again.statusCode).toBe(401)
    const reg = await client(t.app).request('POST', '/api/auth/register', { email, password: PASSWORD, inviteCode: 'test-invite-code' })
    expect(reg.statusCode).toBe(201)
  })

  it('leaves other families untouched', async () => {
    t = await makeApp()
    const { http: a } = await registerFamily(t.app)
    const { http: b } = await registerFamily(t.app)
    const pb = await createProfile(b)
    await b.request('POST', `/api/profiles/${pb}/sync`, { since: 0, push: { docs: [skillDoc('A1')] } })
    await a.request('DELETE', '/api/account', { password: PASSWORD })
    expect(n('SELECT COUNT(*) n FROM docs')).toBe(1)
    expect(n('SELECT COUNT(*) n FROM families')).toBe(1)
  })
})
