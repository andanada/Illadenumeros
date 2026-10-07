import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './connection.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const FILE_PATTERN = /^(\d{3,})_[a-z0-9_]+\.sql$/

export interface Migration {
  readonly version: number
  readonly name: string
  readonly sql: string
}

export function loadMigrations(dir: string = MIGRATIONS_DIR): readonly Migration[] {
  return readdirSync(dir)
    .map((name) => ({ name, match: FILE_PATTERN.exec(name) }))
    .filter((f): f is { name: string; match: RegExpExecArray } => f.match !== null)
    .map((f) => ({ version: Number(f.match[1]), name: f.name, sql: readFileSync(join(dir, f.name), 'utf8') }))
    .sort((a, b) => a.version - b.version)
}

/** Applies pending migrations, each inside its own transaction. Idempotent. Returns applied versions. */
export function migrate(db: Db, migrations: readonly Migration[] = loadMigrations()): readonly number[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)')
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => (r as { version: number }).version))
  const record = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
  const applied: number[] = []
  for (const m of migrations) {
    if (done.has(m.version)) continue
    db.transaction(() => {
      db.exec(m.sql)
      record.run(m.version, m.name, Date.now())
    })()
    applied.push(m.version)
  }
  return applied
}
