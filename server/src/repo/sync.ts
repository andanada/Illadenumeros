import { prep, type Db } from '../db/connection.js'
import { checkDocData, type AttemptData, type DocData, type DocKind, type ValidDoc } from '../lib/docSchemas.js'
import { mergeDoc } from '../lib/merge.js'

export const PULL_PAGE_SIZE = 1000

export interface PushedAttempt {
  readonly id: string
  readonly data: AttemptData
  readonly createdAt: number
}

export interface DocOut {
  readonly kind: DocKind
  readonly key: string
  readonly data: DocData
  readonly updatedAt: number
  readonly seq: number
}

export interface AttemptOut {
  readonly id: string
  readonly data: AttemptData
  readonly createdAt: number
  readonly seq: number
}

export interface ProfileQuota {
  readonly docsPerProfile: number
  readonly attemptsPerProfile: number
}

/** Thrown inside the sync transaction to roll the whole push back. */
export class SyncAbort extends Error {
  constructor(
    readonly reason: 'merged_invalid' | 'quota_exceeded',
    readonly index: number = -1,
    readonly detail: string = '',
  ) {
    super(reason)
  }
}

export interface SyncResult {
  readonly seq: number
  readonly docs: readonly DocOut[]
  readonly attempts: readonly AttemptOut[]
  readonly hasMore: boolean
}

interface RawDoc {
  kind: DocKind
  key: string
  data: string
  updated_at: number
  seq: number
}

interface RawAttempt {
  id: string
  data: string
  created_at: number
  seq: number
}

const nextSeq = (db: Db): number => (prep(db, 'UPDATE seq_counter SET value = value + 1 WHERE id = 1 RETURNING value').get() as { value: number }).value

export const currentSeq = (db: Db): number => (prep(db, 'SELECT value FROM seq_counter WHERE id = 1').get() as { value: number }).value

function upsertDoc(db: Db, profileId: string, doc: ValidDoc, index: number): void {
  const existing = prep(db, 'SELECT data, updated_at FROM docs WHERE profile_id = ? AND kind = ? AND key = ?').get(
    profileId,
    doc.kind,
    doc.key,
  ) as { data: string; updated_at: number } | undefined
  if (!existing) {
    prep(db, 'INSERT INTO docs (profile_id, kind, key, data, updated_at, seq) VALUES (?, ?, ?, ?, ?, ?)').run(
      profileId,
      doc.kind,
      doc.key,
      JSON.stringify(doc.data),
      doc.updatedAt,
      nextSeq(db),
    )
    return
  }
  const merged = mergeDoc(
    doc.kind,
    { data: JSON.parse(existing.data) as DocData, updatedAt: existing.updated_at },
    { data: doc.data, updatedAt: doc.updatedAt },
  )
  // H1: a union of two valid docs can exceed the caps; re-validate the merged result before storing it.
  const checked = checkDocData(doc.kind, merged.data)
  if (!checked.ok) throw new SyncAbort('merged_invalid', index, checked.error)
  const json = JSON.stringify(merged.data)
  // Unchanged result: do not bump seq, so other devices are not asked to re-download it.
  if (json === existing.data && merged.updatedAt === existing.updated_at) return
  prep(db, 'UPDATE docs SET data = ?, updated_at = ?, seq = ? WHERE profile_id = ? AND kind = ? AND key = ?').run(
    json,
    merged.updatedAt,
    nextSeq(db),
    profileId,
    doc.kind,
    doc.key,
  )
}

/** Attempt ids are scoped per profile (L3): another family's ids neither block nor reveal anything. */
function insertAttempt(db: Db, profileId: string, a: PushedAttempt): void {
  const exists = prep(db, 'SELECT 1 AS x FROM attempts WHERE profile_id = ? AND id = ?').get(profileId, a.id)
  if (exists) return
  prep(db, 'INSERT INTO attempts (id, profile_id, data, created_at, seq) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id, id) DO NOTHING').run(
    a.id,
    profileId,
    JSON.stringify(a.data),
    a.createdAt,
    nextSeq(db),
  )
}

/** Applies a push and computes the pull page in ONE transaction. The caller has already validated profile ownership. */
export function syncProfile(
  db: Db,
  profileId: string,
  since: number,
  docs: readonly ValidDoc[],
  attempts: readonly PushedAttempt[],
  quota: ProfileQuota,
): SyncResult {
  return db.transaction((): SyncResult => {
    docs.forEach((d, index) => upsertDoc(db, profileId, d, index))
    for (const a of attempts) insertAttempt(db, profileId, a)
    if (docs.length > 0 || attempts.length > 0) assertQuota(db, profileId, quota)
    return pull(db, profileId, since, new Set(attempts.map((a) => a.id)))
  })()
}

/** M1: checked after applying the push, inside the transaction, so exceeding it rolls everything back. */
function assertQuota(db: Db, profileId: string, quota: ProfileQuota): void {
  const counts = countProfileData(db, profileId)
  if (counts.docs > quota.docsPerProfile || counts.attempts > quota.attemptsPerProfile) throw new SyncAbort('quota_exceeded')
}

function pull(db: Db, profileId: string, since: number, justPushed: ReadonlySet<string>): SyncResult {
  const limit = PULL_PAGE_SIZE + 1
  const rawDocs = prep(db, 'SELECT kind, key, data, updated_at, seq FROM docs WHERE profile_id = ? AND seq > ? ORDER BY seq LIMIT ?').all(
    profileId,
    since,
    limit,
  ) as RawDoc[]
  // Fetch extra rows to compensate for the ones filtered out because the client just pushed them.
  const rawAttempts = (
    prep(db, 'SELECT id, data, created_at, seq FROM attempts WHERE profile_id = ? AND seq > ? ORDER BY seq LIMIT ?').all(
      profileId,
      since,
      limit + justPushed.size,
    ) as RawAttempt[]
  ).filter((a) => !justPushed.has(a.id))

  const merged = [
    ...rawDocs.map((r) => ({ seq: r.seq, doc: r })),
    ...rawAttempts.map((r) => ({ seq: r.seq, attempt: r })),
  ].sort((a, b) => a.seq - b.seq)
  const page = merged.slice(0, PULL_PAGE_SIZE)
  const hasMore = merged.length > PULL_PAGE_SIZE
  const last = page[page.length - 1]

  const outDocs: DocOut[] = []
  const outAttempts: AttemptOut[] = []
  for (const item of page) {
    if ('doc' in item) {
      const r = item.doc
      outDocs.push({ kind: r.kind, key: r.key, data: JSON.parse(r.data) as DocData, updatedAt: r.updated_at, seq: r.seq })
    } else {
      const r = item.attempt
      outAttempts.push({ id: r.id, data: JSON.parse(r.data) as AttemptData, createdAt: r.created_at, seq: r.seq })
    }
  }
  // Sequence numbers are unique across docs and attempts, so the cursor can cut anywhere.
  // When nothing is left, the global counter is a safe cursor: everything of this profile up to it was returned.
  const seq = hasMore && last ? last.seq : Math.max(since, currentSeq(db))
  return { seq, docs: outDocs, attempts: outAttempts, hasMore }
}

const EXPORT_CHUNK = 1000

/*
 * Export iterators page by seq (keyset) instead of holding an open SQLite cursor: a cursor kept open across
 * async stream writes would block other requests' transactions on the shared connection.
 */
export function* iterateDocs(db: Db, profileId: string): Generator<DocOut> {
  let after = 0
  for (;;) {
    const rows = prep(
      db,
      'SELECT kind, key, data, updated_at, seq FROM docs WHERE profile_id = ? AND seq > ? ORDER BY seq LIMIT ?',
    ).all(profileId, after, EXPORT_CHUNK) as RawDoc[]
    for (const r of rows) yield { kind: r.kind, key: r.key, data: JSON.parse(r.data) as DocData, updatedAt: r.updated_at, seq: r.seq }
    const last = rows[rows.length - 1]
    if (!last || rows.length < EXPORT_CHUNK) return
    after = last.seq
  }
}

export function* iterateAttempts(db: Db, profileId: string): Generator<AttemptOut> {
  let after = 0
  for (;;) {
    const rows = prep(
      db,
      'SELECT id, data, created_at, seq FROM attempts WHERE profile_id = ? AND seq > ? ORDER BY seq LIMIT ?',
    ).all(profileId, after, EXPORT_CHUNK) as RawAttempt[]
    for (const r of rows) yield { id: r.id, data: JSON.parse(r.data) as AttemptData, createdAt: r.created_at, seq: r.seq }
    const last = rows[rows.length - 1]
    if (!last || rows.length < EXPORT_CHUNK) return
    after = last.seq
  }
}

export interface ProfileCounts {
  readonly docs: number
  readonly attempts: number
}

export function countProfileData(db: Db, profileId: string): ProfileCounts {
  const docs = prep(db, 'SELECT COUNT(*) AS n FROM docs WHERE profile_id = ?').get(profileId) as { n: number }
  const attempts = prep(db, 'SELECT COUNT(*) AS n FROM attempts WHERE profile_id = ?').get(profileId) as { n: number }
  return { docs: docs.n, attempts: attempts.n }
}
