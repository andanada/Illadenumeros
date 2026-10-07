import { Writable } from 'node:stream'
import { pino } from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db/connection.js'
import { client, createProfile, INVITE, makeApp, PASSWORD, registerFamily, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

describe('CSRF guard', () => {
  it('rejects non-GET requests without X-Requested-With: mm', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: http.cookie() ?? '', 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('csrf_rejected')
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200) // session still alive
  })

  it('rejects a wrong header value and non-JSON content types', async () => {
    t = await makeApp()
    const wrong = await client(t.app).request('POST', '/api/auth/login', { email: 'a@b.co', password: 'x' }, { 'x-requested-with': 'XMLHttpRequest' })
    expect(wrong.statusCode).toBe(403)
    const form = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-requested-with': 'mm', 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'email=a',
    })
    expect(form.statusCode).toBe(403)
    const text = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-requested-with': 'mm', 'content-type': 'text/plain' },
      payload: '{}',
    })
    expect(text.statusCode).toBe(403)
  })

  it('applies to PUT and DELETE too', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    for (const method of ['PUT', 'DELETE'] as const) {
      const res = await t.app.inject({ method, url: `/api/profiles/${id}`, headers: { cookie: http.cookie() ?? '' } })
      expect(res.statusCode).toBe(403)
    }
  })

  it('does not require the header on GET', async () => {
    t = await makeApp()
    const res = await t.app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
  })
})

describe('response hardening', () => {
  it('sets no-store, helmet headers and a generic 404 on every response', async () => {
    t = await makeApp()
    for (const url of ['/api/health', '/api/auth/me', '/api/nope']) {
      const res = await t.app.inject({ method: 'GET', url })
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['content-security-policy']).toContain("default-src 'none'")
      expect(res.headers['x-powered-by']).toBeUndefined()
    }
    expect((await t.app.inject({ method: 'GET', url: '/api/nope' })).statusCode).toBe(404)
  })

  it('health exposes only ok and version', async () => {
    t = await makeApp()
    const body = (await t.app.inject({ method: 'GET', url: '/api/health' })).json()
    expect(Object.keys(body).sort()).toEqual(['ok', 'version'])
  })

  it('returns 400 for malformed JSON and 413 above 1 MB', async () => {
    t = await makeApp()
    const bad = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
      payload: '{nope',
    })
    expect(bad.statusCode).toBe(400)
    expect(bad.json()).toEqual({ error: 'invalid_json' })
    const big = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(1_100_000) }),
    })
    expect(big.statusCode).toBe(413)
  })

  it('maps unexpected failures to a generic 500 without details', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    t.ctx.db.exec('ALTER TABLE profiles RENAME TO profiles_gone')
    const res = await http.request('GET', '/api/profiles')
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: 'internal_error' })
  })
})

describe('rate limiting', () => {
  it('limits globally per IP', async () => {
    t = await makeApp({ RATE_LIMIT_GLOBAL: '3' })
    const codes: number[] = []
    for (let i = 0; i < 5; i++) codes.push((await t.app.inject({ method: 'GET', url: '/api/auth/me', remoteAddress: '10.1.1.1' })).statusCode)
    expect(codes).toEqual([401, 401, 401, 429, 429])
    const other = await t.app.inject({ method: 'GET', url: '/api/auth/me', remoteAddress: '10.1.1.2' })
    expect(other.statusCode).toBe(401)
  })

  it('limits auth endpoints more strictly', async () => {
    t = await makeApp({ RATE_LIMIT_AUTH: '2' })
    const http = client(t.app)
    const codes: number[] = []
    for (let i = 0; i < 4; i++) {
      codes.push((await http.request('POST', '/api/auth/register', { email: `a${i}@b.co`, password: PASSWORD, inviteCode: 'bad' })).statusCode)
    }
    expect(codes).toEqual([403, 403, 429, 429])
  })

  it('limits sync per family (M2: was per session cookie)', async () => {
    t = await makeApp({ RATE_LIMIT_SYNC: '2' })
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const codes: number[] = []
    for (let i = 0; i < 4; i++) codes.push((await http.request('POST', `/api/profiles/${id}/sync`, { since: 0 })).statusCode)
    expect(codes).toEqual([200, 200, 429, 429])
    // A different family from the same IP has its own budget.
    const { http: other } = await registerFamily(t.app, undefined, '10.0.0.1')
    const otherId = await createProfile(other)
    expect((await other.request('POST', `/api/profiles/${otherId}/sync`, { since: 0 })).statusCode).toBe(200)
  })

  it('trusts X-Forwarded-For only from the local proxy', async () => {
    t = await makeApp({ RATE_LIMIT_GLOBAL: '2' })
    const hit = (xff: string, remoteAddress: string) =>
      t!.app.inject({ method: 'GET', url: '/api/auth/me', remoteAddress, headers: { 'x-forwarded-for': xff } })
    // From the proxy: different forwarded clients have separate budgets.
    for (let i = 0; i < 3; i++) await hit('198.51.100.1', '127.0.0.1')
    expect((await hit('198.51.100.1', '127.0.0.1')).statusCode).toBe(429)
    expect((await hit('198.51.100.2', '127.0.0.1')).statusCode).toBe(401)
    // From anywhere else the header is ignored, so spoofing it does not reset the budget.
    for (let i = 0; i < 3; i++) await hit(`203.0.113.${i}`, '10.7.7.7')
    expect((await hit('203.0.113.99', '10.7.7.7')).statusCode).toBe(429)
  })
})

describe('logging', () => {
  it('logs method, route template, status, latency and request id, but never bodies, passwords or emails', async () => {
    const lines: string[] = []
    const sink = new Writable({
      write(chunk: Buffer, _enc, cb) {
        lines.push(chunk.toString())
        cb()
      },
    })
    const config = loadConfig({
      NODE_ENV: 'test',
      IP_HASH_SALT: 'y'.repeat(40),
      REGISTRATION_CODE: INVITE,
      ARGON2_MEMORY_KIB: '8192',
      ARGON2_TIME_COST: '1',
    })
    const built = await buildApp({ config, db: openDatabase(':memory:'), logger: pino({ level: 'info' }, sink) })
    const secretPassword = 'super-secret-password-zzz'
    await built.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      remoteAddress: '203.0.113.50',
      headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'private@example.com', password: secretPassword, inviteCode: INVITE }),
    })
    await built.app.inject({ method: 'GET', url: '/api/profiles/11111111-1111-4111-8111-111111111111/export' })
    await built.app.close()
    const output = lines.join('')
    expect(output).toContain('"route":"/api/auth/register"')
    expect(output).toContain('"route":"/api/profiles/:id/export"')
    expect(output).toMatch(/"status":201/)
    expect(output).toMatch(/"latencyMs":\d+/)
    expect(output).not.toContain(secretPassword)
    expect(output).not.toContain('private@example.com')
    expect(output).not.toContain(INVITE)
    expect(output).not.toContain('203.0.113.50')
    expect(output).not.toContain('11111111-1111')
  })
})
