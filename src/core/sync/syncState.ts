import { z } from 'zod'
import { emptyRewards, type MatesDb } from '../storage/db'

/*
 * Per-player sync cursors, stored in that player's own `meta` table (so they travel with the
 * player's database and disappear with it):
 *   syncSeq          last server `seq` pulled (the `since` of the next pull)
 *   lastPushedAt     local time at the START of the last successful push of docs (skills/facts changed later are re-sent)
 *   attemptsPushedAt createdAt of the newest attempt the server confirmed (re-sending overlaps is safe)
 *   syncedRewards / syncedSettings / syncedProfile  JSON of the last version agreed with the server
 *                    (rewards and settings have no timestamp: a difference means "changed here")
 *   quarantine       items the server rejected (422 after bisecting): `kind:key@updatedAt` or `attempt:id`
 *   detached         the profile was deleted from the account elsewhere: never uploaded again
 */

export const SYNC_META_KEYS = {
  syncSeq: 'syncSeq',
  lastPushedAt: 'lastPushedAt',
  attemptsPushedAt: 'attemptsPushedAt',
  syncedRewards: 'syncedRewards',
  syncedSettings: 'syncedSettings',
  syncedProfile: 'syncedProfile',
  quarantine: 'syncQuarantine',
  detached: 'syncDetached',
} as const

export const MAX_QUARANTINE = 500

export interface SyncState {
  syncSeq: number
  lastPushedAt: number
  attemptsPushedAt: number
  syncedRewards?: string
  syncedSettings?: string
  syncedProfile?: string
  quarantine: string[]
  /** The profile was deleted from the account (elsewhere): not uploaded again; local progress kept. */
  detached?: boolean
}

const cursor = z.number().int().nonnegative()
const snapshot = z.string().max(200_000)
const SCHEMAS = {
  syncSeq: cursor,
  lastPushedAt: cursor,
  attemptsPushedAt: cursor,
  syncedRewards: snapshot,
  syncedSettings: snapshot,
  syncedProfile: snapshot,
  quarantine: z.array(z.string().max(200)),
  detached: z.boolean(),
} as const satisfies { [K in keyof SyncState]-?: z.ZodType<NonNullable<SyncState[K]>> }

const FIELDS = Object.keys(SCHEMAS) as (keyof SyncState)[]

export async function readSyncState(db: MatesDb): Promise<SyncState> {
  const rows = await db.meta.bulkGet(FIELDS.map((f) => SYNC_META_KEYS[f]))
  const base: SyncState = { syncSeq: 0, lastPushedAt: 0, attemptsPushedAt: 0, quarantine: [] }
  return FIELDS.reduce<SyncState>((state, field, i) => {
    const parsed = SCHEMAS[field].safeParse(rows[i]?.value)
    return parsed.success ? { ...state, [field]: parsed.data } : state
  }, base)
}

/** Writes only the given fields (usable inside a transaction that includes `meta`). */
export async function writeSyncState(db: MatesDb, patch: Partial<SyncState>): Promise<void> {
  const rows = FIELDS.flatMap((field) => {
    const value = patch[field]
    if (value === undefined) return []
    const capped = field === 'quarantine' && Array.isArray(value) ? value.slice(-MAX_QUARANTINE) : value
    return [{ key: SYNC_META_KEYS[field], value: SCHEMAS[field].parse(capped) }]
  })
  if (rows.length > 0) await db.meta.bulkPut(rows)
}

/** Snapshots matching an emptied player (Començar de zero): nothing of it counts as a local change. */
export const resetSnapshots = (): Pick<SyncState, 'syncedRewards' | 'syncedSettings'> => {
  const r = emptyRewards()
  return { syncedRewards: JSON.stringify({ ...r, stickers: [], daysPlayed: [], missionsDone: [] }), syncedSettings: JSON.stringify({ diagnosticDone: false }) }
}

/** Forgets everything agreed with a server (other account, or the account was deleted). */
export async function clearSyncState(db: MatesDb): Promise<void> {
  await db.meta.bulkDelete(Object.values(SYNC_META_KEYS))
}
