import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { assertDatabaseWritable, ConfigError, loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db/connection.js'
import { loadMigrations, migrate } from '../src/db/migrate.js'
import { safeEqual, saltedHash } from '../src/lib/crypto.js'
import { createWindowLimiter } from '../src/lib/windowLimiter.js'
import { createLogger } from '../src/logger.js'
import { runMaintenance } from '../src/maintenance.js'
import { APP_VERSION } from '../src/version.js'
import { makeApp, registerFamily, type TestApp } from './helpers.js'

const SALT = 's'.repeat(32)
const prod = (extra: Record<string, string> = {}) => ({ NODE_ENV: 'production', IP_HASH_SALT: SALT, ...extra })

let dirs: string[] = []
let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'mm-'))
  dirs.push(d)
  return d
}

describe('boot checks', () => {
  it('accepts a valid production config and defaults to secure cookies', () => {
    const c = loadConfig(prod())
    expect(c.cookieSecure).toBe(true)
    expect(c.host).toBe('127.0.0.1')
    expect(c.port).toBe(3100)
    expect(c.registrationCode).toBeNull()
    expect(c.trustProxy).toEqual(['127.0.0.1', '::1'])
    expect(loadConfig(prod({ TRUST_PROXY: '172.16.0.0/12, ' })).trustProxy).toEqual(['172.16.0.0/12'])
    expect(Object.isFrozen(c)).toBe(true)
  })

  it('refuses production without IP_HASH_SALT or with a short one', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(ConfigError)
    expect(() => loadConfig(prod({ IP_HASH_SALT: 'short' }))).toThrow(/at least 32/)
  })

  it('refuses insecure cookies in production but allows them in development', () => {
    expect(() => loadConfig(prod({ SESSION_COOKIE_SECURE: 'false' }))).toThrow(/SESSION_COOKIE_SECURE/)
    const dev = loadConfig({ NODE_ENV: 'development', SESSION_COOKIE_SECURE: 'false' })
    expect(dev.cookieSecure).toBe(false)
    expect(dev.ipHashSalt.length).toBeGreaterThanOrEqual(32) // ephemeral
  })

  it('rejects short salts outside production too and invalid values without echoing them', () => {
    expect(() => loadConfig({ IP_HASH_SALT: 'tiny' })).toThrow(ConfigError)
    try {
      loadConfig({ PORT: 'secret-garbage' })
      expect.unreachable()
    } catch (error) {
      expect((error as Error).message).toContain('PORT')
      expect((error as Error).message).not.toContain('secret-garbage')
    }
  })

  it('refuses to start when DATABASE_PATH is not writable', async () => {
    const dir = tmp()
    const blocker = join(dir, 'file')
    writeFileSync(blocker, 'x')
    expect(() => assertDatabaseWritable(join(blocker, 'sub', 'db.sqlite'))).toThrow(/not writable/)
    const config = loadConfig(prod({ DATABASE_PATH: join(blocker, 'sub', 'db.sqlite') }))
    await expect(buildApp({ config, logger: createLogger('silent') })).rejects.toThrow(ConfigError)
    expect(() => assertDatabaseWritable(':memory:')).not.toThrow()
  })

  it('starts on a file database in WAL mode with foreign keys on', async () => {
    const dir = tmp()
    const config = loadConfig(prod({ DATABASE_PATH: join(dir, 'nested', 'mates.db'), LOG_LEVEL: 'silent' }))
    const built = await buildApp({ config, logger: createLogger('silent') })
    expect(built.ctx.db.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(built.ctx.db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect((await built.app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
    await built.app.close()
    built.ctx.db.close()
  })

  it('uses __Host- cookie only when secure', async () => {
    t = await makeApp({ SESSION_COOKIE_SECURE: 'false' })
    const { http } = await registerFamily(t.app)
    expect(http.cookie()?.startsWith('mm_session=')).toBe(true)
  })

  it('version constant matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(APP_VERSION).toBe(pkg.version)
  })
})

describe('migrations', () => {
  it('apply once, are recorded, and are idempotent', () => {
    const db = openDatabase(':memory:')
    const first = migrate(db)
    expect(first).toEqual(loadMigrations().map((m) => m.version))
    expect(first.length).toBeGreaterThanOrEqual(2)
    expect(migrate(db)).toEqual([])
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()
    expect(rows).toHaveLength(first.length)
    expect(db.prepare('SELECT value FROM seq_counter').get()).toEqual({ value: 0 })
  })

  it('roll back a failing migration entirely', () => {
    const db = openDatabase(':memory:')
    migrate(db, [{ version: 1, name: '001_ok.sql', sql: 'CREATE TABLE a (x INTEGER);' }])
    expect(() =>
      migrate(db, [
        { version: 1, name: '001_ok.sql', sql: 'CREATE TABLE a (x INTEGER);' },
        { version: 2, name: '002_bad.sql', sql: 'CREATE TABLE b (x INTEGER); CREATE TABLE a (x INTEGER);' },
      ]),
    ).toThrow()
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'b'").get()).toBeUndefined()
    expect(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get()).toEqual({ n: 1 })
  })

  it('enforce the schema constraints (kinds, name length, cascade)', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    db.prepare("INSERT INTO families (id,email,password_hash,created_at) VALUES ('f','e','h',1)").run()
    expect(() => db.prepare("INSERT INTO profiles (id,family_id,name,created_at,updated_at) VALUES ('p','f','',1,1)").run()).toThrow()
    db.prepare("INSERT INTO profiles (id,family_id,name,created_at,updated_at) VALUES ('p','f','Ok',1,1)").run()
    expect(() => db.prepare("INSERT INTO docs VALUES ('p','bogus','k','{}',1,1)").run()).toThrow()
    expect(() => db.prepare("INSERT INTO profiles (id,family_id,name,created_at,updated_at) VALUES ('q','nofamily','Ok',1,1)").run()).toThrow()
    db.prepare("INSERT INTO docs VALUES ('p','skill','k','{}',1,1)").run()
    db.prepare("DELETE FROM families WHERE id='f'").run()
    expect(db.prepare('SELECT COUNT(*) n FROM docs').get()).toEqual({ n: 0 })
  })
})

describe('maintenance', () => {
  it('prunes audit after 90 days and expired sessions and stale throttles', async () => {
    t = await makeApp()
    await registerFamily(t.app)
    const day = 86_400_000
    const early = runMaintenance(t.ctx.db, t.config, t.clock.now + 89 * day)
    expect(early.auditPruned).toBe(0)
    expect(early.sessionsExpired).toBe(1) // 30-day session is long gone
    expect(runMaintenance(t.ctx.db, t.config, t.clock.now + 91 * day).auditPruned).toBe(1)
  })
})

describe('helpers', () => {
  it('safeEqual compares secrets of any length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'a')).toBe(false)
  })

  it('saltedHash depends on the salt and is not the raw value', () => {
    expect(saltedHash('a'.repeat(32), '1.2.3.4')).not.toBe(saltedHash('b'.repeat(32), '1.2.3.4'))
    expect(saltedHash('a'.repeat(32), '1.2.3.4')).not.toContain('1.2.3.4')
  })

  it('window limiter allows max hits per window and recovers', () => {
    const l = createWindowLimiter(2, 1000)
    expect(l.hit('k', 0).allowed).toBe(true)
    expect(l.hit('k', 10).allowed).toBe(true)
    const blocked = l.hit('k', 20)
    expect(blocked).toEqual({ allowed: false, retryAfterMs: 980 })
    expect(l.hit('other', 20).allowed).toBe(true)
    expect(l.hit('k', 1001).allowed).toBe(true)
  })

  it('window limiter evicts idle keys when it grows large', () => {
    const l = createWindowLimiter(1, 1000)
    for (let i = 0; i < 10_050; i++) l.hit(`k${i}`, 0)
    expect(l.hit('new', 5000).allowed).toBe(true)
  })
})
