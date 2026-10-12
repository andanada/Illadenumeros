import { z } from 'zod'
import type { MatesDb } from './db'

export const META_KEYS = {
  schemaVersion: 'schemaVersion',
  createdAt: 'createdAt',
  lastBackupAt: 'lastBackupAt',
  /** Registry id of the player owning this database: lets a damaged registry be rebuilt with the same ids. */
  playerId: 'playerId',
  /** Minutes of maths a day the town asks for (an adult setting, per player, local). */
  townDailyMinutes: 'townDailyMinutes',
} as const

/** Choices on the family page, in minutes. */
export const DAILY_MINUTES_OPTIONS = [8, 12, 16, 20] as const
export type DailyMinutes = (typeof DAILY_MINUTES_OPTIONS)[number]
export const DEFAULT_DAILY_MINUTES: DailyMinutes = 12
const dailyMinutesSchema = z.union([z.literal(8), z.literal(12), z.literal(16), z.literal(20)])

export const metaRowSchema = z.object({ key: z.string(), value: z.unknown() })
export type MetaRow = z.infer<typeof metaRowSchema>

export interface Meta {
  schemaVersion?: number
  createdAt?: number
  lastBackupAt?: number
  playerId?: string
  townDailyMinutes?: DailyMinutes
}

const timestamp = z.number().int().nonnegative()
const META_VALUE_SCHEMAS = {
  schemaVersion: z.number().int().min(1),
  createdAt: timestamp,
  lastBackupAt: timestamp,
  playerId: z.uuid(),
  townDailyMinutes: dailyMinutesSchema,
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

/** Daily maths target of this player's town; a missing or damaged value means the default (12). */
export async function readDailyMinutes(database: MatesDb): Promise<DailyMinutes> {
  const row = await database.meta.get(META_KEYS.townDailyMinutes)
  const parsed = dailyMinutesSchema.safeParse(row?.value)
  return parsed.success ? parsed.data : DEFAULT_DAILY_MINUTES
}

export async function setDailyMinutes(database: MatesDb, minutes: number): Promise<void> {
  await database.meta.put({ key: META_KEYS.townDailyMinutes, value: dailyMinutesSchema.parse(minutes) })
}

export const BACKUP_REMINDER_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** True when no copy was ever saved, or the last one is older than 14 days. */
export function backupIsDue(lastBackupAt: number | undefined, now: number): boolean {
  return lastBackupAt === undefined || now - lastBackupAt > BACKUP_REMINDER_DAYS * DAY_MS
}
