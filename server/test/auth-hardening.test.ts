/* M3 (password policy, IP buckets), L5 (re-auth failure counter), L6 (invite strength), L8 (argon2 semaphore). */
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { HttpError } from '../src/lib/http.js'
import { ipBucket } from '../src/lib/ip.js'
import { COMMON_PASSWORDS, isWeakPassword } from '../src/lib/passwordPolicy.js'
import { createPasswordHasher, createSemaphore } from '../src/lib/password.js'
import { client, INVITE, makeApp, PASSWORD, registerFamily, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

describe('M3: password policy', () => {
  it('ships a built-in list of about 1000 very common passwords', () => {
    expect(COMMON_PASSWORDS.size).toBeGreaterThanOrEqual(1000)
    for (const p of ['password123', 'qwertyuiop', '1q2w3e4r5t', 'iloveyou123', 'Password1234']) expect(isWeakPassword(p)).toBe(true)
  })

  it('rejects repeated characters and sequential digits, accepts a passphrase', () => {
    for (const p of ['aaaaaaaaaa', '1111111111', '0123456789', '1234567890', '9876543210', '12345678901']) expect(isWeakPassword(p)).toBe(true)
    expect(isWeakPassword(PASSWORD)).toBe(false)
    expect(isWeakPassword('a-brand-new-password')).toBe(false)
  })

  it('register and change-password answer 422 for weak passwords without echoing them', async () => {
    t = await makeApp()
    const reg = await client(t.app).request('POST', '/api/auth/register', { email: 'w@example.com', password: 'password123', inviteCode: INVITE })
    expect(reg.statusCode).toBe(422)
    expect(reg.body).not.toContain('password123')
    const { http } = await registerFamily(t.app)
    const cp = await http.request('POST', '/api/auth/change-password', { current: PASSWORD, new: '1234567890' })
    expect(cp.statusCode).toBe(422)
  })
})

describe('M3: IP buckets', () => {
  it('groups IPv6 into /64 and normalises IPv4-mapped addresses', () => {
    expect(ipBucket('2001:db8::1')).toBe(ipBucket('2001:db8:0:0:ffff:1:2:3'))
    expect(ipBucket('2001:db8::1')).not.toBe(ipBucket('2001:db8:0:1::1'))
    expect(ipBucket('::ffff:203.0.113.5')).toBe('203.0.113.5')
    expect(ipBucket('203.0.113.5')).toBe('203.0.113.5')
    expect(ipBucket('not-an-ip')).toBe('not-an-ip')
  })

  it('the global rate limit treats one /64 as a single client', async () => {
    t = await makeApp({ RATE_LIMIT_GLOBAL: '3' })
    const codes: number[] = []
    for (let i = 1; i <= 5; i++) codes.push((await t.app.inject({ method: 'GET', url: '/api/auth/me', remoteAddress: `2001:db8::${i}` })).statusCode)
    expect(codes).toEqual([401, 401, 401, 429, 429])
  })

  it('audit hashes the bucket, so one /64 produces one hash', async () => {
    t = await makeApp()
    for (const ip of ['2001:db8::a', '2001:db8::b']) {
      await t.app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: ip,
        headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
        payload: JSON.stringify({ email: 'x@example.com', password: 'whatever-123' }),
      })
    }
    const hashes = new Set((t.ctx.db.prepare('SELECT ip_hash FROM audit').all() as { ip_hash: string }[]).map((r) => r.ip_hash))
    expect(hashes.size).toBe(1)
  })
})

describe('L5: re-authentication failure counter per family', () => {
  it('after 5 wrong current passwords in 15 min all sessions are closed and 401 is returned', async () => {
    t = await makeApp()
    const { http, email } = await registerFamily(t.app)
    const other = client(t.app, '10.0.0.9')
    await other.request('POST', '/api/auth/login', { email, password: PASSWORD })
    const codes: number[] = []
    for (let i = 0; i < 5; i++) {
      codes.push((await http.request('POST', '/api/auth/change-password', { current: `wrong-pass-${i}`, new: 'a-brand-new-password' })).statusCode)
    }
    expect(codes).toEqual([403, 403, 403, 403, 401])
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(401)
    expect((await other.request('GET', '/api/auth/me')).statusCode).toBe(401)
    expect((t.ctx.db.prepare('SELECT COUNT(*) n FROM sessions').get() as { n: number }).n).toBe(0)
  })

  it('counts DELETE /api/account failures too, and the window expires', async () => {
    t = await makeApp()
    const { http, email } = await registerFamily(t.app)
    for (let i = 0; i < 4; i++) expect((await http.request('DELETE', '/api/account', { password: `nope-${i}` })).statusCode).toBe(403)
    t.clock.now += 16 * 60_000
    expect((await http.request('DELETE', '/api/account', { password: 'nope-x' })).statusCode).toBe(403) // fresh window
    const fresh = client(t.app)
    await fresh.request('POST', '/api/auth/login', { email, password: PASSWORD })
    for (let i = 0; i < 4; i++) await fresh.request('DELETE', '/api/account', { password: `nope-y${i}` })
    expect((await fresh.request('GET', '/api/auth/me')).statusCode).toBe(401)
  })
})

describe('L6: invite code strength in production', () => {
  const prod = { NODE_ENV: 'production', IP_HASH_SALT: 's'.repeat(32) }
  it('refuses a REGISTRATION_CODE shorter than 20 characters but allows closed registration', () => {
    expect(() => loadConfig({ ...prod, REGISTRATION_CODE: 'short-code' })).toThrow(/REGISTRATION_CODE/)
    expect(loadConfig({ ...prod, REGISTRATION_CODE: 'x'.repeat(20) }).registrationCode).toBe('x'.repeat(20))
    expect(loadConfig({ ...prod, REGISTRATION_CODE: '' }).registrationCode).toBeNull()
    expect(loadConfig({ NODE_ENV: 'test', REGISTRATION_CODE: 'short' }).registrationCode).toBe('short')
  })
})

describe('L8: bounded argon2 concurrency', () => {
  it('semaphore runs at most N tasks, queues up to Q and rejects beyond with 503 + Retry-After', async () => {
    const sem = createSemaphore(2, 3)
    let running = 0
    let peak = 0
    const releases: (() => void)[] = []
    const task = () =>
      sem.run(
        () =>
          new Promise<void>((resolve) => {
            running += 1
            peak = Math.max(peak, running)
            releases.push(() => {
              running -= 1
              resolve()
            })
          }),
      )
    const accepted = Array.from({ length: 5 }, task)
    const rejected = task()
    await expect(rejected).rejects.toBeInstanceOf(HttpError)
    await rejected.catch((e: HttpError) => {
      expect(e.statusCode).toBe(503)
      expect(e.headers).toEqual({ 'Retry-After': '5' })
    })
    while (releases.length > 0 || running > 0) {
      releases.shift()?.()
      await new Promise((r) => setImmediate(r))
    }
    await Promise.all(accepted)
    expect(peak).toBe(2)
  })

  it('the hasher uses the semaphore (2 concurrent, queue 20 by default)', async () => {
    const hasher = createPasswordHasher({ memoryCost: 8192, timeCost: 1, parallelism: 1 })
    const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => hasher.hash(`pw-${i}-xxxxxxxx`)))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(22)
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect((failed.reason as HttpError).statusCode).toBe(503)
  })
})
