import { z } from 'zod'
import { cpaStageSchema, gameIdSchema, MISCONCEPTIONS } from '../ambit/types'
import { factStateSchema, type FactState } from '../engine/leitner'
import { skillStateSchema, type SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import { profileSchema, rewardsSchema, type Profile, type Rewards } from './db'

export const BACKUP_APP_ID = 'mates-magiques'
export const BACKUP_FORMAT_VERSION = 1

export const attemptSchema = z.object({
  id: z.string().min(1),
  ambitId: z.string().min(1),
  skillId: z.string().min(1),
  factKey: z.string().optional(),
  correct: z.boolean(),
  rtMs: z.number().nonnegative(),
  hintsUsed: z.number().int().min(0),
  misconception: z.enum(MISCONCEPTIONS).optional(),
  cpaStage: cpaStageSchema,
  gameId: gameIdSchema,
  sessionId: z.string(),
  createdAt: z.number(),
}) satisfies z.ZodType<Attempt>

/** The file the adult saves. `profile`/`rewards` are null when the device had none yet. */
export const backupFileSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.number().int().nonnegative(),
  profile: profileSchema.nullable(),
  skillStates: z.array(skillStateSchema),
  factStates: z.array(factStateSchema),
  attempts: z.array(attemptSchema),
  rewards: rewardsSchema.nullable(),
})
export type BackupFile = z.infer<typeof backupFileSchema>

/** All the progress tables, as plain data (used for both the local device and the file). */
export interface ProgressData {
  profile: Profile | null
  skillStates: SkillState[]
  factStates: FactState[]
  attempts: Attempt[]
  rewards: Rewards | null
}

/** Envelope checked first: right app and a known version, rows checked one by one later. */
const envelopeSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  formatVersion: z.number().int(),
  exportedAt: z.number().int().nonnegative(),
  profile: z.unknown(),
  skillStates: z.array(z.unknown()),
  factStates: z.array(z.unknown()),
  attempts: z.array(z.unknown()),
  rewards: z.unknown(),
})

export const BACKUP_ERRORS = {
  notBackup: 'Aquest fitxer no és una còpia de Mates Màgiques.',
  newerVersion: 'Aquesta còpia és d’una versió més nova de l’app. Actualitza l’app i torna-ho a provar.',
  unreadable: 'No s’ha pogut llegir el fitxer.',
} as const

export type ParseResult =
  | { ok: true; file: BackupFile; skipped: number }
  | { ok: false; error: string }

function validRows<T>(rows: readonly unknown[], schema: z.ZodType<T>): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

function optionalRow<T>(row: unknown, schema: z.ZodType<T>): { value: T | null; skipped: number } {
  if (row === null || row === undefined) return { value: null, skipped: 0 }
  const parsed = schema.safeParse(row)
  return parsed.success ? { value: parsed.data, skipped: 0 } : { value: null, skipped: 1 }
}

/** Validates an already-parsed JSON value. Invalid rows are dropped and counted, never fatal. */
export function parseBackup(json: unknown): ParseResult {
  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) {
    const version = z.object({ app: z.literal(BACKUP_APP_ID), formatVersion: z.number() }).safeParse(json)
    const isNewer = version.success && version.data.formatVersion > BACKUP_FORMAT_VERSION
    return { ok: false, error: isNewer ? BACKUP_ERRORS.newerVersion : BACKUP_ERRORS.notBackup }
  }
  const raw = envelope.data
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) return { ok: false, error: BACKUP_ERRORS.newerVersion }
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) return { ok: false, error: BACKUP_ERRORS.notBackup }

  const profile = optionalRow(raw.profile, profileSchema)
  const rewards = optionalRow(raw.rewards, rewardsSchema)
  const skillStates = validRows(raw.skillStates, skillStateSchema)
  const factStates = validRows(raw.factStates, factStateSchema)
  const attempts = validRows(raw.attempts, attemptSchema)
  const skipped =
    profile.skipped +
    rewards.skipped +
    (raw.skillStates.length - skillStates.length) +
    (raw.factStates.length - factStates.length) +
    (raw.attempts.length - attempts.length)

  const file = backupFileSchema.parse({
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: raw.exportedAt,
    profile: profile.value,
    skillStates,
    factStates,
    attempts,
    rewards: rewards.value,
  })
  return { ok: true, file, skipped }
}

/** Parses the text of a backup file; never throws. */
export function parseBackupText(text: string): ParseResult {
  try {
    return parseBackup(JSON.parse(text))
  } catch {
    return { ok: false, error: BACKUP_ERRORS.notBackup }
  }
}
