import { prep, type Db } from '../db/connection.js'
import { hashToken, newId, newSessionToken } from '../lib/crypto.js'

export interface SessionPolicy {
  readonly ttlMs: number
  readonly maxMs: number
}

export interface ActiveSession {
  readonly id: string
  readonly familyId: string
  readonly expiresAt: number
  /** True when the sliding expiry was extended (the cookie should be re-issued). */
  readonly refreshed: boolean
}

/** Do not write on every request: slide at most once per interval. */
const SLIDE_INTERVAL_MS = 10 * 60_000

/** M1: a family keeps at most this many sessions; creating one more evicts the oldest. */
export const MAX_SESSIONS_PER_FAMILY = 20

export function createSession(db: Db, familyId: string, policy: SessionPolicy, now: number): { token: string; expiresAt: number } {
  const token = newSessionToken()
  const expiresAt = now + policy.ttlMs
  db.transaction(() => {
    prep(db, 'INSERT INTO sessions (id, family_id, token_hash, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      newId(),
      familyId,
      hashToken(token),
      now,
      now,
      expiresAt,
    )
    prep(
      db,
      'DELETE FROM sessions WHERE family_id = ? AND id NOT IN ' +
        '(SELECT id FROM sessions WHERE family_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)',
    ).run(familyId, familyId, MAX_SESSIONS_PER_FAMILY)
  })()
  return { token, expiresAt }
}

interface RawSession {
  id: string
  family_id: string
  created_at: number
  last_seen_at: number
  expires_at: number
}

/** Resolves a raw cookie token. Expired (sliding or absolute) sessions are deleted and rejected. */
export function resolveSession(db: Db, token: string, policy: SessionPolicy, now: number): ActiveSession | null {
  const row = prep(db, 'SELECT id, family_id, created_at, last_seen_at, expires_at FROM sessions WHERE token_hash = ?').get(
    hashToken(token),
  ) as RawSession | undefined
  if (!row) return null
  const absoluteEnd = row.created_at + policy.maxMs
  if (row.expires_at <= now || absoluteEnd <= now) {
    prep(db, 'DELETE FROM sessions WHERE id = ?').run(row.id)
    return null
  }
  if (now - row.last_seen_at < SLIDE_INTERVAL_MS) {
    return { id: row.id, familyId: row.family_id, expiresAt: row.expires_at, refreshed: false }
  }
  const expiresAt = Math.min(now + policy.ttlMs, absoluteEnd)
  prep(db, 'UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?').run(now, expiresAt, row.id)
  return { id: row.id, familyId: row.family_id, expiresAt, refreshed: true }
}

export const deleteSession = (db: Db, id: string): void => {
  prep(db, 'DELETE FROM sessions WHERE id = ?').run(id)
}

export const deleteOtherSessions = (db: Db, familyId: string, keepId: string): number =>
  prep(db, 'DELETE FROM sessions WHERE family_id = ? AND id <> ?').run(familyId, keepId).changes

export const deleteFamilySessions = (db: Db, familyId: string): number =>
  prep(db, 'DELETE FROM sessions WHERE family_id = ?').run(familyId).changes

export const deleteExpiredSessions = (db: Db, now: number): number =>
  prep(db, 'DELETE FROM sessions WHERE expires_at <= ?').run(now).changes
