/*
 * Regression tests derived from the security review exploit scripts (poc.mts A-E and poc2.mts).
 * Each block reproduces the original attack against an in-memory database and asserts it is now blocked.
 */
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { attemptPush, client, createProfile, makeApp, PASSWORD, registerFamily, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

const H = { 'x-requested-with': 'mm', 'content-type': 'application/json' }
const rewardsRowBytes = (): number =>
  (t!.ctx.db.prepare("SELECT COALESCE(MAX(length(data)), 0) AS n FROM docs WHERE kind = 'rewards'").get() as { n: number }).n

describe('PoC A: rewards doc cannot grow without bound through merges', () => {
  it('rejects the 60 x 900 oversized-sticker pushes and keeps the stored row small and fast', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const statuses = new Set<number>()
    let slowest = 0
    for (let i = 0; i < 60; i++) {
      const stickers = Array.from({ length: 900 }, (_, j) => `s${i}-${j}-`.padEnd(64, 'x'))
      const started = performance.now()
      const res = await http.request('POST', `/api/profiles/${id}/sync`, {
        since: 0,
        push: { docs: [{ kind: 'rewards', key: 'me', updatedAt: i + 1, data: { id: 'me', petals: 0, stickers, daysPlayed: [], missionsDone: [] } }] },
      })
      slowest = Math.max(slowest, performance.now() - started)
      statuses.add(res.statusCode)
    }
    expect([...statuses]).toEqual([422])
    expect(rewardsRowBytes()).toBeLessThanOrEqual(64 * 1024)
    expect(slowest).toBeLessThan(500)
  })
})

describe('PoC poc2: one push with many rewards docs cannot multiply the merged size', () => {
  it('rejects duplicate (kind,key) pairs inside one push with 422 and applies nothing', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const docs = Array.from({ length: 15 }, (_, k) => ({
      kind: 'rewards',
      key: 'me',
      updatedAt: k + 1,
      data: { id: 'me', petals: k, stickers: ['arc'], daysPlayed: [], missionsDone: [] },
    }))
    const res = await http.request('POST', `/api/profiles/${id}/sync`, { since: 1e15, push: { docs } })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('validation_failed')
    expect(rewardsRowBytes()).toBe(0)
  })
})

describe('PoC B: sync cannot be flooded with random cookies and unparsed bodies', () => {
  it('40 unauthenticated requests with random cookies and invalid JSON give only 401/429, never invalid_json', async () => {
    t = await makeApp({ RATE_LIMIT_GLOBAL: '5', RATE_LIMIT_SYNC: '5' })
    const pid = randomUUID()
    const codes: Record<number, number> = {}
    const bodies = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const res = await t.app.inject({
        method: 'POST',
        url: `/api/profiles/${pid}/sync`,
        remoteAddress: '9.9.9.9',
        headers: { ...H, cookie: `__Host-mm_session=${randomUUID()}` },
        payload: '{bad json',
      })
      codes[res.statusCode] = (codes[res.statusCode] ?? 0) + 1
      bodies.add(res.json().error as string)
    }
    expect(Object.keys(codes).sort()).toEqual(['401', '429'])
    expect(codes[429]).toBeGreaterThanOrEqual(30)
    expect(bodies.has('invalid_json')).toBe(false)
  })

  it('limits sync per family across sessions with Retry-After', async () => {
    t = await makeApp({ RATE_LIMIT_SYNC: '3' })
    const { http, email } = await registerFamily(t.app)
    const id = await createProfile(http)
    const second = client(t.app, '10.0.0.77')
    expect((await second.request('POST', '/api/auth/login', { email, password: PASSWORD })).statusCode).toBe(200)
    const codes: number[] = []
    for (const c of [http, second, http, second]) codes.push((await c.request('POST', `/api/profiles/${id}/sync`, { since: 0 })).statusCode)
    expect(codes).toEqual([200, 200, 200, 429])
    const limited = await http.request('POST', `/api/profiles/${id}/sync`, { since: 0 })
    expect(limited.statusCode).toBe(429)
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
  })
})

describe('PoC C: CSRF rejections carry the security headers', () => {
  it('403 csrf_rejected has CSP, nosniff and no-store', async () => {
    t = await makeApp()
    const res = await t.app.inject({ method: 'POST', url: '/api/auth/login', payload: '{}', headers: { 'content-type': 'text/plain' } })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('csrf_rejected')
    expect(res.headers['content-security-policy']).toContain("default-src 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cache-control']).toBe('no-store')
  })
})

describe('PoC D: attempt ids are scoped per profile', () => {
  it('family B can neither silence nor probe an attempt id that family A already used', async () => {
    t = await makeApp()
    const { http: a } = await registerFamily(t.app, 'a@example.com')
    const { http: b } = await registerFamily(t.app, 'b@example.com', '10.0.0.2')
    const pa = await createProfile(a)
    const pb = await createProfile(b)
    const shared = randomUUID()
    await a.request('POST', `/api/profiles/${pa}/sync`, { since: 0, push: { attempts: [attemptPush(shared)] } })
    await b.request('POST', `/api/profiles/${pb}/sync`, { since: 0, push: { attempts: [attemptPush(shared), attemptPush()] } })
    const pullB = (await b.request('POST', `/api/profiles/${pb}/sync`, { since: 0 })).json()
    expect(pullB.attempts).toHaveLength(2) // B's own copy of the id is stored: nothing silenced, nothing revealed
    expect(pullB.attempts.some((x: { id: string }) => x.id === shared)).toBe(true)
    const pullA = (await a.request('POST', `/api/profiles/${pa}/sync`, { since: 0 })).json()
    expect(pullA.attempts).toHaveLength(1)
  })
})

describe('PoC E: distributed brute force', () => {
  const login = (ip: string, email: string, password: string) =>
    t!.app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: ip, headers: H, payload: JSON.stringify({ email, password }) })

  it('an IP lockout does not lock the victim out from another IP', async () => {
    t = await makeApp({ LOGIN_MAX_FAILURES: '5' })
    await registerFamily(t.app, 'v@example.com')
    for (let i = 0; i < 6; i++) await login('6.6.6.6', 'v@example.com', 'wrongwrong')
    expect((await login('6.6.6.6', 'v@example.com', PASSWORD)).statusCode).toBe(429)
    expect((await login('10.0.0.1', ' V@EXAMPLE.com ', PASSWORD)).statusCode).toBe(200)
  })

  it('rotating addresses inside one IPv6 /64 shares a single lockout budget', async () => {
    t = await makeApp({ LOGIN_MAX_FAILURES: '5' })
    await registerFamily(t.app, 'v@example.com')
    let guesses = 0
    for (let n = 0; n < 50; n++) {
      for (let i = 0; i < 4; i++) {
        const res = await login(`2001:db8::${n.toString(16)}`, 'v@example.com', `guess${n}${i}xx`)
        if (res.statusCode === 401) guesses += 1
      }
    }
    expect(guesses).toBeLessThanOrEqual(5)
    expect((await login('2001:db9::1', 'v@example.com', PASSWORD)).statusCode).toBe(200)
  })

  it('caps failed logins per email across many IPs (slows, never locks forever)', async () => {
    t = await makeApp({ LOGIN_MAX_FAILURES: '100', LOGIN_EMAIL_MAX_FAILURES: '30' })
    await registerFamily(t.app, 'v@example.com')
    let guesses = 0
    for (let n = 0; n < 40; n++) if ((await login(`198.51.100.${n}`, 'v@example.com', `guess-${n}-xx`)).statusCode === 401) guesses += 1
    expect(guesses).toBe(30)
    const slowed = await login('203.0.113.9', 'v@example.com', PASSWORD)
    expect(slowed.statusCode).toBe(429)
    expect(Number(slowed.headers['retry-after'])).toBeGreaterThan(0)
    t.clock.now += 61 * 60_000
    expect((await login('203.0.113.9', 'v@example.com', PASSWORD)).statusCode).toBe(200)
  })
})
