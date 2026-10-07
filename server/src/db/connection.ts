import { chmodSync } from 'node:fs'
import Database from 'better-sqlite3'

export type Db = Database.Database
export type Statement = Database.Statement

const cache = new WeakMap<Db, Map<string, Statement>>()

/** Prepared-statement cache. SQL text is always a literal in the repositories: no input ever reaches it. */
export function prep(db: Db, sql: string): Statement {
  let perDb = cache.get(db)
  if (!perDb) {
    perDb = new Map()
    cache.set(db, perDb)
  }
  let stmt = perDb.get(sql)
  if (!stmt) {
    stmt = db.prepare(sql)
    perDb.set(sql, stmt)
  }
  return stmt
}

/**
 * Opens SQLite with WAL, foreign keys, a busy timeout and secure_delete (deleted rows are zeroed on disk).
 * File databases are created 0600 (M4; the process umask 077 also covers the -wal/-shm files).
 */
export function openDatabase(path: string): Db {
  const db = new Database(path)
  if (path !== ':memory:') {
    restrictFileMode(path)
    db.pragma('journal_mode = WAL')
  }
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')
  db.pragma('secure_delete = ON')
  return db
}

function restrictFileMode(path: string): void {
  try {
    chmodSync(path, 0o600)
  } catch {
    // Not fatal (e.g. a file owned by another user on a read-only mount); the boot check reports directory modes.
  }
}

/**
 * L1: after a hard delete, fold the WAL back into the main file and truncate it, so deleted rows do not linger
 * in the -wal file. Must run outside a transaction. A no-op for in-memory databases.
 */
export function checkpointAfterDelete(db: Db): void {
  if (db.memory || db.inTransaction) return
  db.pragma('wal_checkpoint(TRUNCATE)')
}
