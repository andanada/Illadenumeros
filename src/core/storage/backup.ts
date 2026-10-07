import { factStateSchema } from '../engine/leitner'
import { skillStateSchema } from '../engine/mastery'
import { useProgress } from '../progress/store'
import { isEmptyProgress, mergeProgress, type ImportStrategy } from './backupMerge'
import {
  attemptSchema,
  BACKUP_APP_ID,
  BACKUP_ERRORS,
  BACKUP_FORMAT_VERSION,
  backupFileSchema,
  parseBackupText,
  type BackupFile,
  type ProgressData,
} from './backupSchema'
import { db, profileSchema, rewardsSchema } from './db'

export type { BackupFile } from './backupSchema'
export type { ImportStrategy } from './backupMerge'

export interface BackupSummary {
  childName: string | undefined
  exportedAt: number
  skills: number
  facts: number
  attempts: number
}

export type ReadResult = { ok: true; file: BackupFile; skipped: number; summary: BackupSummary } | { ok: false; error: string }

export type ImportResult =
  | { ok: true; strategy: ImportStrategy; skipped: number; counts: { skills: number; facts: number; attempts: number } }
  | { ok: false; reason: 'invalid' | 'needs-strategy' | 'write-failed'; error: string }

export const IMPORT_ERRORS = {
  needsStrategy: 'Ja hi ha progrés en aquest dispositiu. Tria si vols substituir-lo o combinar-lo amb la còpia.',
  writeFailed: 'No s’ha pogut recuperar la còpia. El progrés d’aquest dispositiu no s’ha tocat.',
} as const

const valid = <T,>(rows: readonly unknown[], parse: (row: unknown) => { success: boolean; data?: T }): T[] =>
  rows.flatMap((row) => {
    const parsed = parse(row)
    return parsed.success && parsed.data !== undefined ? [parsed.data] : []
  })

/** Everything currently stored on this device; damaged rows are left out. */
async function readLocal(): Promise<ProgressData> {
  const [profile, skills, facts, attempts, rewards] = await Promise.all([
    db.profile.get('me'),
    db.skillStates.toArray(),
    db.factStates.toArray(),
    db.attempts.toArray(),
    db.rewards.get('me'),
  ])
  const p = profileSchema.safeParse(profile)
  const r = rewardsSchema.safeParse(rewards)
  return {
    profile: p.success ? p.data : null,
    skillStates: valid(skills, (row) => skillStateSchema.safeParse(row)),
    factStates: valid(facts, (row) => factStateSchema.safeParse(row)),
    attempts: valid(attempts, (row) => attemptSchema.safeParse(row)),
    rewards: r.success ? r.data : null,
  }
}

/** Snapshot of the whole progress as a validated backup file. */
export async function exportProgress(now: () => number = Date.now): Promise<BackupFile> {
  const local = await readLocal()
  return backupFileSchema.parse({ app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now(), ...local })
}

/** Compact JSON (no pretty printing): attempts can be many thousands. */
export const serializeBackup = (file: BackupFile): string => JSON.stringify(file)

async function readText(source: string | Blob): Promise<string | undefined> {
  if (typeof source === 'string') return source
  try {
    return await source.text()
  } catch {
    return undefined
  }
}

/** Reads and validates a backup without applying it, so the adult can see a preview first. */
export async function readBackup(source: string | Blob): Promise<ReadResult> {
  const text = await readText(source)
  if (text === undefined) return { ok: false, error: BACKUP_ERRORS.unreadable }
  const parsed = parseBackupText(text)
  if (!parsed.ok) return parsed
  const { file } = parsed
  return {
    ...parsed,
    summary: {
      childName: file.profile?.name,
      exportedAt: file.exportedAt,
      skills: file.skillStates.length,
      facts: file.factStates.length,
      attempts: file.attempts.length,
    },
  }
}

/** Writes the merged data in ONE transaction: if any write fails, nothing changes. */
async function writeAll(data: ProgressData): Promise<void> {
  await db.transaction('rw', [db.profile, db.skillStates, db.factStates, db.attempts, db.rewards], async () => {
    await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear()])
    if (data.profile) await db.profile.put(data.profile)
    await db.skillStates.bulkPut(data.skillStates)
    await db.factStates.bulkPut(data.factStates)
    await db.attempts.bulkPut(data.attempts)
    if (data.rewards) await db.rewards.put(data.rewards)
  })
}

/**
 * Restores a backup. Without `strategy`, it only proceeds when this device has no progress
 * ('replace'); otherwise the caller must choose, so newer local data is never lost silently.
 * Never throws: every failure comes back as `{ ok: false, error }` in Catalan.
 */
export async function importProgress(source: string | Blob, options: { strategy?: ImportStrategy } = {}): Promise<ImportResult> {
  const read = await readBackup(source)
  if (!read.ok) return { ok: false, reason: 'invalid', error: read.error }
  try {
    const local = await readLocal()
    const strategy = options.strategy ?? (isEmptyProgress(local) ? 'replace' : undefined)
    if (!strategy) return { ok: false, reason: 'needs-strategy', error: IMPORT_ERRORS.needsStrategy }
    const incoming: ProgressData = { ...read.file }
    const merged = mergeProgress(local, incoming, strategy)
    await writeAll(merged)
    await useProgress.getState().load()
    return {
      ok: true,
      strategy,
      skipped: read.skipped,
      counts: { skills: merged.skillStates.length, facts: merged.factStates.length, attempts: merged.attempts.length },
    }
  } catch {
    return { ok: false, reason: 'write-failed', error: IMPORT_ERRORS.writeFailed }
  }
}
