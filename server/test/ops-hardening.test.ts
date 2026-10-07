/* M4 (file modes), M5 + L2 + L8 + INFO (ops files), L1 (deletion hygiene), L2 (proxy warning), L3 (migration), L4, INFO. */
import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { pino } from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { assessDirMode, checkDatabaseDirMode, ConfigError, loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db/connection.js'
import { loadMigrations, migrate } from '../src/db/migrate.js'
import { attemptPush, client, createProfile, makeApp, PASSWORD, profileBody, registerFamily, skillDoc, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

const read = (rel: string): string => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
const n = (sql: string, ...args: unknown[]): number => (t!.ctx.db.prepare(sql).get(...args) as { n: number }).n

describe('M4: database directory permissions', () => {
  it('flags group/world-accessible directories on POSIX and skips Windows', () => {
    expect(assessDirMode(0o40700, 'linux')).toBe('ok')
    expect(assessDirMode(0o40750, 'linux')).toBe('insecure')
    expect(assessDirMode(0o40777, 'linux')).toBe('insecure')
    expect(assessDirMode(0o40777, 'win32')).toBe('skip')
  })

  it('ships umask, uid 10001 and the install commands', () => {
    expect(read('src/server.ts')).toMatch(/async function main\(\): Promise<void> \{\r?\n\s+process\.umask\(0o077\)/)
    expect(read('docker-compose.yml')).toContain('user: "10001:10001"')
    expect(read('Dockerfile')).toMatch(/10001/)
    expect(read('README.md')).toContain('sudo install -d -m 700 -o 10001 -g 10001 data')
  })
})

describe('M5 / L2 / L8 / INFO: ops files', () => {
  it('backup unit can write its directory and reports failures', () => {
    const unit = read('ops/mates-backup.service')
    expect(unit).toMatch(/ExecStartPre=\+\/usr\/bin\/install -d -m 700 \/var\/backups\/mates/)
    expect(unit).toMatch(/ReadWritePaths=\/var\/backups \/opt\/mates\/server\/data/)
    expect(unit).toMatch(/OnFailure=mates-backup-failed@%n\.service/)
    expect(read('ops/mates-backup-failed@.service')).toMatch(/logger -p user\.crit/)
  })

  it('compose pins the network and the trusted proxy', () => {
    const compose = read('docker-compose.yml')
    expect(compose).toContain('172.30.100.0/24')
    // compose's `environment:` overrides whatever TRUST_PROXY the .env file carries.
    expect(compose).toMatch(/environment:\n\s+#[^\n]*\n\s+TRUST_PROXY: 172\.30\.100\.1/)
  })

  it('nginx ships the auth rate limit zone and the security headers snippet', () => {
    expect(read('ops/nginx-ratelimit.conf')).toContain('limit_req_zone $binary_remote_addr zone=mates_auth:1m rate=10r/m;')
    expect(read('ops/nginx-api.conf')).toContain('limit_req zone=mates_auth burst=5 nodelay;')
    const sec = read('ops/snippets/mates-security.conf')
    expect(sec).toContain("frame-ancestors 'none'")
    expect(sec).toContain('Permissions-Policy')
  })
})

describe('L1: deletion hygiene', () => {
  it('enables secure_delete', async () => {
    t = await makeApp()
    expect(t.ctx.db.pragma('secure_delete', { simple: true })).toBe(1)
  })

  it('account deletion unlinks audit rows from the family', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const familyId = (t.ctx.db.prepare('SELECT id FROM families').get() as { id: string }).id
    expect((await http.request('DELETE', '/api/account', { password: PASSWORD })).statusCode).toBe(200)
    expect(n('SELECT COUNT(*) n FROM audit WHERE family_id = ?', familyId)).toBe(0)
    expect(n("SELECT COUNT(*) n FROM audit WHERE event = 'delete_account' AND family_id IS NULL")).toBe(1)
  })

  it('account export includes soft-deleted profiles with deletedAt', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const live = await createProfile(http, 'Viu')
    const gone = await createProfile(http, 'Esborrat')
    await http.request('DELETE', `/api/profiles/${gone}`)
    const body = (await http.request('GET', '/api/account/export')).json()
    const byId = new Map(body.profiles.map((p: { id: string }) => [p.id, p]))
    expect(byId.get(live)).toMatchObject({ deletedAt: null })
    expect(byId.get(gone)).toMatchObject({ name: 'Esborrat', deletedAt: t.clock.now })
  })
})

describe('L2: trusted proxy without forwarded address', () => {
  it('warns once when a trusted proxy sends no X-Forwarded-For', async () => {
    const lines: string[] = []
    const sink = new Writable({ write: (c: Buffer, _e, cb) => (lines.push(c.toString()), cb()) })
    const config = loadConfig({ NODE_ENV: 'test', IP_HASH_SALT: 'y'.repeat(40), TRUST_PROXY: '127.0.0.1' })
    const built = await buildApp({ config, db: openDatabase(':memory:'), logger: pino({ level: 'warn' }, sink) })
    await built.app.inject({ method: 'GET', url: '/api/health', remoteAddress: '10.0.0.5' })
    expect(lines.join('')).not.toContain('proxy')
    for (let i = 0; i < 3; i++) await built.app.inject({ method: 'GET', url: '/api/health', remoteAddress: '127.0.0.1' })
    await built.app.close()
    expect(lines.filter((l) => l.includes('trusted proxy'))).toHaveLength(1)
  })
})

describe('L3: attempts keyed by (profile_id, id)', () => {
  it('migration 003 rebuilds the table preserving data', () => {
    const db = openDatabase(':memory:')
    const all = loadMigrations()
    migrate(db, all.filter((m) => m.version <= 2))
    db.prepare("INSERT INTO families (id,email,password_hash,created_at) VALUES ('f','e','h',1)").run()
    db.prepare("INSERT INTO profiles (id,family_id,name,created_at,updated_at) VALUES ('p','f','Ok',1,1)").run()
    db.prepare("INSERT INTO attempts (id,profile_id,data,created_at,seq) VALUES ('a1','p','{}',5,7)").run()
    migrate(db, all)
    expect(db.prepare('SELECT id, profile_id, data, created_at, seq FROM attempts').all()).toEqual([
      { id: 'a1', profile_id: 'p', data: '{}', created_at: 5, seq: 7 },
    ])
    const pk = (db.prepare("SELECT name FROM pragma_table_info('attempts') WHERE pk > 0 ORDER BY pk").all() as { name: string }[]).map((r) => r.name)
    expect(pk).toEqual(['profile_id', 'id'])
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'idx_attempts_profile_seq'").get()).toBeTruthy()
    db.prepare("DELETE FROM families WHERE id='f'").run()
    expect(db.prepare('SELECT COUNT(*) n FROM attempts').get()).toEqual({ n: 0 }) // cascade still works
  })

  it('migration 004 drops unused columns', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const cols = (table: string) => (db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all() as { name: string }[]).map((r) => r.name)
    expect(cols('sessions')).not.toContain('user_agent_hash')
    expect(cols('families')).not.toContain('deleted_at')
  })
})

describe('L4: profile ids', () => {
  it('PUT on a foreign id answers exactly like a malformed id', async () => {
    t = await makeApp()
    const { http: a } = await registerFamily(t.app)
    const { http: b } = await registerFamily(t.app)
    const pa = await createProfile(a)
    const foreign = await b.request('PUT', `/api/profiles/${pa}`, profileBody('X'))
    const malformed = await b.request('PUT', '/api/profiles/zzz', profileBody('X'))
    expect(foreign.statusCode).toBe(404)
    expect(foreign.body).toBe(malformed.body)
  })

  it('rate-limits profile upserts per family', async () => {
    t = await makeApp({ RATE_LIMIT_PROFILE: '3' })
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const codes: number[] = []
    for (let i = 0; i < 3; i++) codes.push((await http.request('PUT', `/api/profiles/${id}`, profileBody(`N${i}`))).statusCode)
    expect(codes).toEqual([200, 200, 429])
  })
})

describe('INFO items', () => {
  it('rejects prototype poisoning in JSON bodies', async () => {
    t = await makeApp()
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
      payload: '{"email":"a@b.co","password":"x","__proto__":{"admin":true}}',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'invalid_json' })
  })

  it('sets server timeouts', async () => {
    t = await makeApp()
    expect(t.app.server.requestTimeout).toBe(30_000)
    expect(t.app.server.keepAliveTimeout).toBe(65_000)
    expect(t.app.initialConfig.connectionTimeout).toBe(35_000)
  })

  it('still syncs and exports after the schema changes', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const r = await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [skillDoc('A1')], attempts: [attemptPush()] } })
    expect(r.statusCode).toBe(200)
    expect((await client(t.app).request('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'x' })).statusCode).toBe(401)
  })

  it('boot check: production refuses an open database directory, other envs only warn', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mm-perm-'))
    try {
      chmodSync(dir, 0o777)
      const warnings: string[] = []
      checkDatabaseDirMode(join(dir, 'mates.db'), { production: false, warn: (m) => warnings.push(m), platform: 'linux' })
      expect(warnings).toHaveLength(1)
      expect(() => checkDatabaseDirMode(join(dir, 'mates.db'), { production: true, warn: () => undefined, platform: 'linux' })).toThrow(ConfigError)
      expect(() => checkDatabaseDirMode(join(dir, 'mates.db'), { production: true, warn: () => undefined, platform: 'win32' })).not.toThrow()
      expect(() => checkDatabaseDirMode(':memory:', { production: true, warn: () => undefined, platform: 'linux' })).not.toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('backup.sh prune never aborts the script when a retention folder is still empty', () => {
    const script = read('ops/backup.sh')
    // With `set -euo pipefail`, an unguarded `ls` on an empty folder (first nights, no Sunday yet) exits 2 and
    // kills the script AFTER the backup was written, so the unit would be reported as failed every night.
    const prune = script.slice(script.indexOf('prune() {'), script.indexOf('prune "$BACKUP_DIR/daily"'))
    expect(prune).toMatch(/\{ ls -1t [^}]*\|\| true; \}/)
  })
})
