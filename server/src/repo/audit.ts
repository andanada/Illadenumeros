import { prep, type Db } from '../db/connection.js'

export type AuditEvent = 'register' | 'login' | 'login_failed' | 'logout' | 'change_password' | 'delete_account' | 'delete_profile'

/** Events only: no content, and the IP is a salted hash. */
export const writeAudit = (db: Db, familyId: string | null, event: AuditEvent, now: number, ipHash: string | null): void => {
  prep(db, 'INSERT INTO audit (family_id, event, at, ip_hash) VALUES (?, ?, ?, ?)').run(familyId, event, now, ipHash)
}

/** L1: on account deletion the remaining audit rows no longer point at the (deleted) family. */
export const unlinkAuditFamily = (db: Db, familyId: string): number =>
  prep(db, 'UPDATE audit SET family_id = NULL WHERE family_id = ?').run(familyId).changes

export const pruneAudit = (db: Db, olderThan: number): number => prep(db, 'DELETE FROM audit WHERE at < ?').run(olderThan).changes

interface ThrottleRow {
  failures: number
  locked_until: number
}

export interface ThrottlePolicy {
  readonly maxFailures: number
  readonly lockoutMs: number
}

/** Remaining lockout in ms (0 when the key may try). */
export function lockoutRemaining(db: Db, key: string, now: number): number {
  const row = prep(db, 'SELECT failures, locked_until FROM login_throttle WHERE key = ?').get(key) as ThrottleRow | undefined
  return row && row.locked_until > now ? row.locked_until - now : 0
}

export function recordLoginFailure(db: Db, key: string, policy: ThrottlePolicy, now: number): void {
  db.transaction(() => {
    const row = prep(db, 'SELECT failures, locked_until FROM login_throttle WHERE key = ?').get(key) as ThrottleRow | undefined
    // A previous lockout that already expired starts a new counting window.
    const base = row && row.locked_until > 0 && row.locked_until <= now ? 0 : (row?.failures ?? 0)
    const failures = base + 1
    const lockedUntil = failures >= policy.maxFailures ? now + policy.lockoutMs : 0
    prep(
      db,
      'INSERT INTO login_throttle (key, failures, locked_until, updated_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until, updated_at = excluded.updated_at',
    ).run(key, failures, lockedUntil, now)
  })()
}

export const clearLoginFailures = (db: Db, key: string): void => {
  prep(db, 'DELETE FROM login_throttle WHERE key = ?').run(key)
}

export const pruneThrottle = (db: Db, olderThan: number): number =>
  prep(db, 'DELETE FROM login_throttle WHERE updated_at < ?').run(olderThan).changes
