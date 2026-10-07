import { prep, type Db } from '../db/connection.js'

export interface FamilyRow {
  readonly id: string
  readonly email: string
  readonly passwordHash: string
  readonly createdAt: number
  readonly lastLoginAt: number | null
}

interface RawFamily {
  id: string
  email: string
  password_hash: string
  created_at: number
  last_login_at: number | null
}

const toFamily = (r: RawFamily | undefined): FamilyRow | null =>
  r ? { id: r.id, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at, lastLoginAt: r.last_login_at } : null

export const findFamilyByEmail = (db: Db, email: string): FamilyRow | null =>
  toFamily(prep(db, 'SELECT id, email, password_hash, created_at, last_login_at FROM families WHERE email = ?').get(email) as RawFamily | undefined)

export const findFamilyById = (db: Db, id: string): FamilyRow | null =>
  toFamily(prep(db, 'SELECT id, email, password_hash, created_at, last_login_at FROM families WHERE id = ?').get(id) as RawFamily | undefined)

/** Returns false when the email is already registered (UNIQUE violation). */
export function insertFamily(db: Db, f: { id: string; email: string; passwordHash: string; now: number }): boolean {
  const res = prep(db, 'INSERT OR IGNORE INTO families (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    f.id,
    f.email,
    f.passwordHash,
    f.now,
  )
  return res.changes === 1
}

export const touchLogin = (db: Db, id: string, now: number): void => {
  prep(db, 'UPDATE families SET last_login_at = ? WHERE id = ?').run(now, id)
}

export const updatePasswordHash = (db: Db, id: string, passwordHash: string): void => {
  prep(db, 'UPDATE families SET password_hash = ? WHERE id = ?').run(passwordHash, id)
}

/** Hard delete: sessions, profiles, docs and attempts go with it through ON DELETE CASCADE. */
export const deleteFamily = (db: Db, id: string): boolean => prep(db, 'DELETE FROM families WHERE id = ?').run(id).changes === 1
