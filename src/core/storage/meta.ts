import { z } from 'zod'
import type { MatesDb } from './db'

export const META_KEYS = {
  schemaVersion: 'schemaVersion',
  createdAt: 'createdAt',
  lastBackupAt: 'lastBackupAt',
  /** Registry id of the player owning this database: lets a damaged registry be rebuilt with the same ids. */
  playerId: 'playerId',
} as const

export const metaRowSchema = z.object({ key: z.string(), value: z.unknown() })
export type MetaRow = z.infer<typeof metaRowSchema>

export interface Meta {
  schemaVersion?: number
  createdAt?: number
  lastBackupAt?: number
  playerId?: string
}

const timestamp = z.number().int().nonnegative()
const META_VALUE_SCHEMAS = {
  schemaVersion: z.number().int().min(1),
  createdAt: timestamp,
  lastBackupAt: timestamp,
  playerId: z.uuid(),
} as const satisfies { [K in keyof Meta]-?: z.ZodType<NonNullable<Meta[K]>> }

export const initialMeta = (schemaVersion: number, createdAt: number): MetaRow[] => [
  { key: META_KEYS.schemaVersion, value: schemaVersion },
  { key: META_KEYS.createdAt, value: createdAt },
]

/** Reads the meta table; a damaged value is ignored rather than failing the whole read. */
export async function readMeta(database: MatesDb): Promise<Meta> {
  const rows = await database.meta.toArray()
  return rows.reduce<Meta>((meta, row) => {
    const parsedRow = metaRowSchema.safeParse(row)
    if (!parsedRow.success || !(parsedRow.data.key in META_VALUE_SCHEMAS)) return meta
    const key = parsedRow.data.key as keyof Meta
    const value = META_VALUE_SCHEMAS[key].safeParse(parsedRow.data.value)
    return value.success ? { ...meta, [key]: value.data } : meta
  }, {})
}

/** Stamps the database with the id of the player that owns it. */
export async function setPlayerId(database: MatesDb, playerId: string): Promise<void> {
  await database.meta.put({ key: META_KEYS.playerId, value: z.uuid().parse(playerId) })
}

/** Remembers when the adult last saved a copy (drives the gentle reminder on the family page). */
export async function setLastBackupAt(database: MatesDb, at: number): Promise<void> {
  await database.meta.put({ key: META_KEYS.lastBackupAt, value: timestamp.parse(at) })
}

export const BACKUP_REMINDER_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** True when no copy was ever saved, or the last one is older than 14 days. */
export function backupIsDue(lastBackupAt: number | undefined, now: number): boolean {
  return lastBackupAt === undefined || now - lastBackupAt > BACKUP_REMINDER_DAYS * DAY_MS
}
