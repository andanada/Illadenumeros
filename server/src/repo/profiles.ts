import { prep, type Db } from '../db/connection.js'
import type { ProfileInput } from '../lib/docSchemas.js'

export const MAX_PROFILES_PER_FAMILY = 12
/** M1: soft-deleted rows count too, so create/delete cycles cannot pile up rows during the 30-day grace. */
export const MAX_PROFILE_ROWS_PER_FAMILY = 24

export interface ProfileRow {
  readonly id: string
  readonly name: string
  readonly character: string | null
  readonly color: string | null
  readonly createdAt: number
  readonly updatedAt: number
}

interface RawProfile {
  id: string
  name: string
  character: string | null
  color: string | null
  created_at: number
  updated_at: number
}

const toProfile = (r: RawProfile): ProfileRow => ({
  id: r.id,
  name: r.name,
  character: r.character,
  color: r.color,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const COLUMNS = 'id, name, character, color, created_at, updated_at'

export const listProfiles = (db: Db, familyId: string): ProfileRow[] =>
  (
    prep(db, `SELECT ${COLUMNS} FROM profiles WHERE family_id = ? AND deleted_at IS NULL ORDER BY created_at, id`).all(
      familyId,
    ) as RawProfile[]
  ).map(toProfile)

export interface ExportedProfile extends ProfileRow {
  readonly deletedAt: number | null
}

/** Every profile of the family, soft-deleted ones included (data still held until purge, so it is exported: L1). */
export const listProfilesForExport = (db: Db, familyId: string): ExportedProfile[] =>
  (
    prep(db, `SELECT ${COLUMNS}, deleted_at FROM profiles WHERE family_id = ? ORDER BY created_at, id`).all(familyId) as (RawProfile & {
      deleted_at: number | null
    })[]
  ).map((r) => ({ ...toProfile(r), deletedAt: r.deleted_at }))

/** Family-scoped lookup: a foreign, deleted or unknown id is indistinguishable (null). */
export function getOwnedProfile(db: Db, familyId: string, id: string): ProfileRow | null {
  const row = prep(db, `SELECT ${COLUMNS} FROM profiles WHERE id = ? AND family_id = ? AND deleted_at IS NULL`).get(id, familyId) as
    | RawProfile
    | undefined
  return row ? toProfile(row) : null
}

export type UpsertResult = { status: 'ok'; profile: ProfileRow; created: boolean } | { status: 'not_found' } | { status: 'limit' }

export function upsertProfile(db: Db, familyId: string, id: string, input: ProfileInput, now: number): UpsertResult {
  return db.transaction((): UpsertResult => {
    const existing = prep(db, 'SELECT family_id, deleted_at FROM profiles WHERE id = ?').get(id) as
      | { family_id: string; deleted_at: number | null }
      | undefined
    if (existing && (existing.family_id !== familyId || existing.deleted_at !== null)) return { status: 'not_found' }
    if (existing) {
      prep(db, 'UPDATE profiles SET name = ?, character = ?, color = ?, updated_at = ? WHERE id = ? AND family_id = ?').run(
        input.name,
        input.character,
        input.color,
        now,
        id,
        familyId,
      )
    } else {
      const count = prep(
        db,
        'SELECT COUNT(*) AS total, COALESCE(SUM(deleted_at IS NULL), 0) AS active FROM profiles WHERE family_id = ?',
      ).get(familyId) as { total: number; active: number }
      if (count.active >= MAX_PROFILES_PER_FAMILY || count.total >= MAX_PROFILE_ROWS_PER_FAMILY) return { status: 'limit' }
      prep(
        db,
        'INSERT INTO profiles (id, family_id, name, character, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id, familyId, input.name, input.character, input.color, input.createdAt, now)
    }
    const profile = getOwnedProfile(db, familyId, id)
    return profile ? { status: 'ok', profile, created: !existing } : { status: 'not_found' }
  })()
}

/** Soft delete (30-day grace, then purged by the maintenance job). Returns false when not owned. */
export const softDeleteProfile = (db: Db, familyId: string, id: string, now: number): boolean =>
  prep(db, 'UPDATE profiles SET deleted_at = ?, updated_at = ? WHERE id = ? AND family_id = ? AND deleted_at IS NULL').run(
    now,
    now,
    id,
    familyId,
  ).changes === 1

/** Immediate hard delete (docs and attempts cascade). Works on soft-deleted rows too. */
export const purgeProfile = (db: Db, familyId: string, id: string): boolean =>
  prep(db, 'DELETE FROM profiles WHERE id = ? AND family_id = ?').run(id, familyId).changes === 1

export const purgeSoftDeletedBefore = (db: Db, cutoff: number): number =>
  prep(db, 'DELETE FROM profiles WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff).changes
