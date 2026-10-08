import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { FactState } from '../engine/leitner'
import type { SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import { initialMeta, type MetaRow } from './meta'

export const CHARACTER_IDS = ['nyx', 'mixa', 'blau', 'nuvol', 'melo'] as const
export type CharacterId = (typeof CHARACTER_IDS)[number]

export const THEME_COLORS = ['lila', 'rosa', 'blau', 'menta', 'taronja', 'negre'] as const
export type ThemeColor = (typeof THEME_COLORS)[number]

export const profileSchema = z.object({
  id: z.literal('me'),
  name: z.string().trim().min(1).max(20),
  character: z.enum(CHARACTER_IDS),
  color: z.enum(THEME_COLORS),
  diagnosticDone: z.boolean(),
  createdAt: z.number(),
})
export type Profile = z.infer<typeof profileSchema>

export const rewardsSchema = z.object({
  id: z.literal('me'),
  petals: z.number().int().min(0),
  stickers: z.array(z.string()),
  daysPlayed: z.array(z.string()),
  missionsDone: z.array(z.string()),
  /** Items of the pet's house the child bought (ids of features/decor/catalog.ts). Absent in older rows: defaults to none. */
  decorOwned: z.array(z.string()).default([]),
  /** Bought items currently placed in the house (one per spot). */
  decorPlaced: z.array(z.string()).default([]),
  /** Days (YYYY-MM-DD) whose daily challenge was completed. */
  dailyDone: z.array(z.string()).default([]),
})
export type Rewards = z.infer<typeof rewardsSchema>

export const emptyRewards = (): Rewards => ({ id: 'me', petals: 0, stickers: [], daysPlayed: [], missionsDone: [], decorOwned: [], decorPlaced: [], dailyDone: [] })

/** The original single-player database; it stays the database of the first (adopted) player. */
export const DB_NAME = 'mates-magiques'

/*
 * ─── Schema versions ───────────────────────────────────────────────────────────
 * Each child's progress lives only in their own database (see playerDbs.ts), so a schema change must NEVER lose rows.
 *
 * How to add the next migration (e.g. v3):
 *   1. Add `SCHEMA_V3 = { ...only the tables/indexes that change... }` below. Never edit an
 *      older SCHEMA_Vn or remove an older `this.version(n)` call: devices in the wild may
 *      still be at that version and Dexie replays the chain v1 -> v2 -> v3.
 *   2. Bump `SCHEMA_VERSION` and register `this.version(3).stores(SCHEMA_V3).upgrade(...)`.
 *      The upgrade callback receives a transaction over the OLD rows: map them to the new
 *      shape with `table.toCollection().modify(...)` (or read + bulkPut), never by clearing.
 *   3. Store the new number in meta (`META_KEYS.schemaVersion`) inside the upgrade.
 *   4. Add a test to `migrations.test.ts`: seed a database at the previous version with
 *      realistic rows, open `MatesDb`, and assert every row is still there.
 *   5. If the backup file shape changes too, bump `BACKUP_FORMAT_VERSION` and keep
 *      importing the old format (see backupSchema.ts).
 */

/** v1: the first published version. */
export const SCHEMA_V1 = {
  profile: 'id',
  skillStates: 'skillId',
  factStates: 'factKey',
  attempts: 'id, createdAt, skillId, sessionId',
  rewards: 'id',
} as const

/** v2: adds `meta` ({ key, value }) with `schemaVersion`, `createdAt` and `lastBackupAt`. */
export const SCHEMA_V2 = { meta: 'key' } as const

export const SCHEMA_VERSION = 2

export class MatesDb extends Dexie {
  profile!: Table<Profile, string>
  skillStates!: Table<SkillState, string>
  factStates!: Table<FactState, string>
  attempts!: Table<Attempt, string>
  rewards!: Table<Rewards, string>
  meta!: Table<MetaRow, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(1).stores(SCHEMA_V1)
    this.version(2)
      .stores(SCHEMA_V2)
      .upgrade(async (tx) => {
        // Keep the real start date when the child already had a profile.
        const parsed = profileSchema.safeParse(await tx.table('profile').get('me'))
        const createdAt = parsed.success ? parsed.data.createdAt : Date.now()
        await tx.table('meta').bulkPut(initialMeta(2, createdAt))
      })
    // Only for a brand-new database (no upgrade runs then).
    this.on('populate', (tx) => {
      void tx.table('meta').bulkPut(initialMeta(SCHEMA_VERSION, Date.now()))
    })
  }
}

/** Ask the browser not to evict the child's progress (iOS/Safari can clear unused site data). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
