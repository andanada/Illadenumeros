import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { runMaintenance } from '../src/maintenance.js'
import { createProfile, makeApp, profileBody, registerFamily, skillDoc, type TestApp } from './helpers.js'

const DAY = 86_400_000
let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

describe('profiles CRUD', () => {
  it('requires authentication', async () => {
    t = await makeApp()
    const res = await t.app.inject({ method: 'GET', url: '/api/profiles' })
    expect(res.statusCode).toBe(401)
  })

  it('creates with a client uuid (201), updates idempotently (200) and lists', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = randomUUID()
    const created = await http.request('PUT', `/api/profiles/${id}`, profileBody('Nyx'))
    expect(created.statusCode).toBe(201)
    expect(created.json().profile).toMatchObject({ id, name: 'Nyx', character: 'nyx', color: 'lila', createdAt: 1_700_000_000_000 })
    const again = await http.request('PUT', `/api/profiles/${id}`, { ...profileBody('Nyx'), createdAt: 5 })
    expect(again.statusCode).toBe(200)
    expect(again.json().profile.createdAt).toBe(1_700_000_000_000) // createdAt is fixed at creation
    const renamed = await http.request('PUT', `/api/profiles/${id}`, { ...profileBody('Mixa'), character: 'mixa', color: 'rosa' })
    expect(renamed.json().profile).toMatchObject({ name: 'Mixa', character: 'mixa', color: 'rosa' })
    const list = (await http.request('GET', '/api/profiles')).json().profiles
    expect(list).toHaveLength(1)
  })

  it('validates name length, enums, uuid and extra fields are stripped', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = randomUUID()
    for (const bad of [
      { ...profileBody(), name: '' },
      { ...profileBody(), name: 'x'.repeat(21) },
      { ...profileBody(), character: 'dragon' },
      { ...profileBody(), color: 'verde' },
      { ...profileBody(), createdAt: 'yesterday' },
      { name: 'a' },
    ]) {
      const res = await http.request('PUT', `/api/profiles/${id}`, bad)
      expect(res.statusCode).toBe(422)
      expect(res.json().issues.length).toBeLessThanOrEqual(5)
    }
    expect((await http.request('PUT', '/api/profiles/not-a-uuid', profileBody())).statusCode).toBe(404)
    const trimmed = await http.request('PUT', `/api/profiles/${id}`, { ...profileBody('  Ana  '), surname: 'Garcia' })
    expect(trimmed.json().profile.name).toBe('Ana')
    expect(JSON.stringify(trimmed.json())).not.toContain('Garcia')
  })

  it('caps profiles per family', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    for (let i = 0; i < 12; i++) await createProfile(http, `P${i}`)
    const res = await http.request('PUT', `/api/profiles/${randomUUID()}`, profileBody())
    expect(res.statusCode).toBe(409)
  })

  it('soft deletes: hidden immediately, data kept until the retention job purges it', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [skillDoc('A1')] } })
    expect((await http.request('DELETE', `/api/profiles/${id}`)).statusCode).toBe(200)
    expect((await http.request('GET', '/api/profiles')).json().profiles).toEqual([])
    expect((await http.request('POST', `/api/profiles/${id}/sync`, { since: 0 })).statusCode).toBe(404)
    expect((await http.request('GET', `/api/profiles/${id}/export`)).statusCode).toBe(404)
    expect((await http.request('PUT', `/api/profiles/${id}`, profileBody())).statusCode).toBe(404) // no resurrection
    expect((await http.request('DELETE', `/api/profiles/${id}`)).statusCode).toBe(404)
    const rows = () => (t!.ctx.db.prepare('SELECT COUNT(*) n FROM docs').get() as { n: number }).n
    expect(rows()).toBe(1)
    runMaintenance(t.ctx.db, t.config, t.clock.now + 29 * DAY)
    expect(rows()).toBe(1)
    const report = runMaintenance(t.ctx.db, t.config, t.clock.now + 31 * DAY)
    expect(report.profilesPurged).toBe(1)
    expect(rows()).toBe(0)
  })

  it('purge=true hard deletes immediately with docs and attempts', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [skillDoc('A1')] } })
    expect((await http.request('DELETE', `/api/profiles/${id}?purge=true`)).statusCode).toBe(200)
    for (const table of ['profiles', 'docs', 'attempts']) {
      expect((t.ctx.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n).toBe(0)
    }
    expect((await http.request('DELETE', `/api/profiles/${id}?purge=maybe`)).statusCode).toBe(422)
  })

  it('purges a soft-deleted profile on demand', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    await http.request('DELETE', `/api/profiles/${id}`)
    expect((await http.request('DELETE', `/api/profiles/${id}?purge=true`)).statusCode).toBe(200)
    expect((t.ctx.db.prepare('SELECT COUNT(*) n FROM profiles').get() as { n: number }).n).toBe(0)
  })

  it('me lists the profile summary', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    await createProfile(http, 'Blau')
    const me = (await http.request('GET', '/api/auth/me')).json()
    expect(me.profiles).toHaveLength(1)
    expect(me.profiles[0].name).toBe('Blau')
  })
})
