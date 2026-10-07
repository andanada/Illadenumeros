import { afterEach, describe, expect, it } from 'vitest'
import { client, INVITE, makeApp, PASSWORD, registerFamily, type TestApp } from './helpers.js'

const DAY = 86_400_000
let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

const reg = (over: Record<string, unknown> = {}) => ({ email: 'Mama@Example.com ', password: PASSWORD, inviteCode: INVITE, ...over })

describe('register', () => {
  it('creates the family, normalizes the email and sets a hardened cookie', async () => {
    t = await makeApp()
    const http = client(t.app)
    const res = await http.request('POST', '/api/auth/register', reg())
    expect(res.statusCode).toBe(201)
    expect(res.json().family.email).toBe('mama@example.com')
    const cookie = res.cookies.find((c) => c.name === '__Host-mm_session')
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/' })
    expect(cookie?.domain).toBeUndefined()
    const me = await http.request('GET', '/api/auth/me')
    expect(me.statusCode).toBe(200)
    expect(me.json().family.email).toBe('mama@example.com')
  })

  it('is closed when REGISTRATION_CODE is unset', async () => {
    t = await makeApp({ REGISTRATION_CODE: '' })
    const res = await client(t.app).request('POST', '/api/auth/register', reg())
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('registration_closed')
  })

  it('rejects a wrong invite code', async () => {
    t = await makeApp()
    const res = await client(t.app).request('POST', '/api/auth/register', reg({ inviteCode: 'nope' }))
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('invalid_invite')
  })

  it('does not reveal existing emails to someone without the invite', async () => {
    t = await makeApp()
    await registerFamily(t.app, 'taken@example.com')
    const res = await client(t.app).request('POST', '/api/auth/register', reg({ email: 'taken@example.com', inviteCode: 'bad' }))
    expect(res.json().error).toBe('invalid_invite')
  })

  it('rejects weak passwords and malformed emails without echoing them', async () => {
    t = await makeApp()
    const weak = await client(t.app).request('POST', '/api/auth/register', reg({ password: 'short' }))
    expect(weak.statusCode).toBe(422)
    expect(weak.body).not.toContain('short')
    const bad = await client(t.app).request('POST', '/api/auth/register', reg({ email: 'not-an-email' }))
    expect(bad.statusCode).toBe(422)
    const long = await client(t.app).request('POST', '/api/auth/register', reg({ password: 'x'.repeat(129) }))
    expect(long.statusCode).toBe(422)
  })

  it('rejects duplicate emails (case-insensitive) with 409', async () => {
    t = await makeApp()
    await registerFamily(t.app, 'dup@example.com')
    const res = await client(t.app).request('POST', '/api/auth/register', reg({ email: 'DUP@example.com' }))
    expect(res.statusCode).toBe(409)
  })

  it('stores an argon2id hash and only the SHA-256 of the session token', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app, 'a@example.com')
    const family = t.ctx.db.prepare('SELECT password_hash FROM families').get() as { password_hash: string }
    expect(family.password_hash.startsWith('$argon2id$')).toBe(true)
    const raw = http.cookie()?.split('=')[1] ?? ''
    const row = t.ctx.db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string }
    expect(row.token_hash).not.toBe(raw)
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(t.ctx.db.prepare('SELECT * FROM sessions').all())).not.toContain(raw)
  })
})

describe('login', () => {
  it('logs in with valid credentials and rotates the session', async () => {
    t = await makeApp()
    const { email } = await registerFamily(t.app, 'login@example.com')
    const http = client(t.app)
    const res = await http.request('POST', '/api/auth/login', { email: email.toUpperCase(), password: PASSWORD })
    expect(res.statusCode).toBe(200)
    const first = http.cookie()
    await http.request('POST', '/api/auth/login', { email, password: PASSWORD })
    expect(http.cookie()).not.toBe(first)
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200)
    const count = t.ctx.db.prepare('SELECT COUNT(*) n FROM sessions').get() as { n: number }
    expect(count.n).toBe(2) // register session + this client's single rotated session
  })

  it('answers identically for unknown email and wrong password', async () => {
    t = await makeApp()
    await registerFamily(t.app, 'real@example.com')
    const wrong = await client(t.app).request('POST', '/api/auth/login', { email: 'real@example.com', password: 'wrong-password-1' })
    const unknown = await client(t.app).request('POST', '/api/auth/login', { email: 'ghost@example.com', password: 'wrong-password-1' })
    expect(wrong.statusCode).toBe(401)
    expect(unknown.statusCode).toBe(401)
    expect(wrong.json()).toEqual(unknown.json())
  })

  it('verifies a password hash even for unknown users', async () => {
    t = await makeApp()
    let calls = 0
    const original = t.ctx.hasher.verify
    ;(t.ctx.hasher as { verify: typeof original }).verify = async (h, p) => {
      calls += 1
      return original(h, p)
    }
    await client(t.app).request('POST', '/api/auth/login', { email: 'ghost@example.com', password: 'whatever-123' })
    expect(calls).toBe(1)
  })

  it('locks out after repeated failures, even with the right password, until the lockout passes', async () => {
    t = await makeApp({ LOGIN_MAX_FAILURES: '3', LOGIN_LOCKOUT_MINUTES: '10' })
    await registerFamily(t.app, 'lock@example.com')
    const http = client(t.app)
    for (let i = 0; i < 3; i++) {
      const r = await http.request('POST', '/api/auth/login', { email: 'lock@example.com', password: 'bad-password-1' })
      expect(r.statusCode).toBe(401)
    }
    const locked = await http.request('POST', '/api/auth/login', { email: 'lock@example.com', password: PASSWORD })
    expect(locked.statusCode).toBe(429)
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0)
    // Another IP is not locked out (key is IP + email).
    const other = await client(t.app, '10.9.9.9').request('POST', '/api/auth/login', { email: 'lock@example.com', password: PASSWORD })
    expect(other.statusCode).toBe(200)
    t.clock.now += 11 * 60_000
    const after = await http.request('POST', '/api/auth/login', { email: 'lock@example.com', password: PASSWORD })
    expect(after.statusCode).toBe(200)
  })

  it('applies the 5/min per IP+email rate limit', async () => {
    t = await makeApp({ RATE_LIMIT_LOGIN: '5', LOGIN_MAX_FAILURES: '100' })
    const http = client(t.app)
    const codes: number[] = []
    for (let i = 0; i < 7; i++) {
      codes.push((await http.request('POST', '/api/auth/login', { email: 'rl@example.com', password: 'bad-password-1' })).statusCode)
    }
    expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true)
    expect(codes.slice(5)).toEqual([429, 429])
    const otherEmail = await http.request('POST', '/api/auth/login', { email: 'rl2@example.com', password: 'bad-password-1' })
    expect(otherEmail.statusCode).toBe(401)
  })
})

describe('session lifecycle', () => {
  it('logout invalidates the session and clears the cookie', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const stolen = http.cookie() ?? ''
    expect((await http.request('POST', '/api/auth/logout')).statusCode).toBe(200)
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(401)
    const replay = await client(t.app).request('GET', '/api/auth/me', undefined, { cookie: stolen })
    expect(replay.statusCode).toBe(401)
  })

  it('logout without session is harmless', async () => {
    t = await makeApp()
    expect((await client(t.app).request('POST', '/api/auth/logout')).statusCode).toBe(200)
  })

  it('rejects requests without a cookie or with a garbage token', async () => {
    t = await makeApp()
    expect((await client(t.app).request('GET', '/api/auth/me')).statusCode).toBe(401)
    const bad = await client(t.app).request('GET', '/api/auth/me', undefined, { cookie: '__Host-mm_session=garbage' })
    expect(bad.statusCode).toBe(401)
  })

  it('expires idle sessions after 30 days and slides while active', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    t.clock.now += 20 * DAY
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200) // slides to day 50
    t.clock.now += 20 * DAY
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200) // day 40 < 50
    t.clock.now += 31 * DAY
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(401)
  })

  it('re-issues the cookie when the expiry slides', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    t.clock.now += 11 * 60_000
    const res = await http.request('GET', '/api/auth/me')
    expect(res.cookies.some((c) => c.name === '__Host-mm_session' && c.httpOnly)).toBe(true)
  })

  it('never outlives the 90 day absolute limit', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    for (let i = 0; i < 4; i++) {
      t.clock.now += 25 * DAY
      const res = await http.request('GET', '/api/auth/me')
      expect(res.statusCode).toBe(i < 3 ? 200 : 401) // day 100 > 90
    }
  })
})

describe('change-password', () => {
  it('changes the password and invalidates the other sessions', async () => {
    t = await makeApp()
    const { http, email } = await registerFamily(t.app, 'cp@example.com')
    const other = client(t.app, '10.0.0.2')
    await other.request('POST', '/api/auth/login', { email, password: PASSWORD })
    const res = await http.request('POST', '/api/auth/change-password', { current: PASSWORD, new: 'a-brand-new-password' })
    expect(res.statusCode).toBe(200)
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(200)
    expect((await other.request('GET', '/api/auth/me')).statusCode).toBe(401)
    const old = await client(t.app).request('POST', '/api/auth/login', { email, password: PASSWORD })
    expect(old.statusCode).toBe(401)
    const fresh = await client(t.app).request('POST', '/api/auth/login', { email, password: 'a-brand-new-password' })
    expect(fresh.statusCode).toBe(200)
  })

  it('rejects a wrong current password and a weak new one', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    expect((await http.request('POST', '/api/auth/change-password', { current: 'nope-nope-nope', new: 'a-brand-new-password' })).statusCode).toBe(403)
    expect((await http.request('POST', '/api/auth/change-password', { current: PASSWORD, new: 'short' })).statusCode).toBe(422)
  })

  it('requires authentication', async () => {
    t = await makeApp()
    const res = await client(t.app).request('POST', '/api/auth/change-password', { current: PASSWORD, new: 'a-brand-new-password' })
    expect(res.statusCode).toBe(401)
  })
})

describe('audit', () => {
  it('records events without content and with salted IP hashes only', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app, 'audit@example.com', '203.0.113.7')
    await http.request('POST', '/api/auth/logout')
    const rows = t.ctx.db.prepare('SELECT * FROM audit').all() as { event: string; ip_hash: string }[]
    expect(rows.map((r) => r.event)).toEqual(['register', 'logout'])
    expect(JSON.stringify(rows)).not.toContain('203.0.113.7')
    expect(JSON.stringify(rows)).not.toContain('audit@example.com')
  })
})
