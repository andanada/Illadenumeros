import { factStateSchema } from '../engine/leitner'
import { skillStateSchema, type SkillState } from '../engine/mastery'
import { emptyRewards, profileSchema, rewardsSchema, type MatesDb } from '../storage/db'
import { WORLD_ROW_ID, worldRowSchema } from '../storage/worldRow'
import { attemptQuarantineId, attemptToPush, backfillSkillTimes, docQuarantineId, factToDoc, normalizeRewards, rewardsToDoc, settingsToDoc, skillToDoc, worldToDoc, type RawDoc } from './docs'
import { checkOutgoingAttempt, checkOutgoingDoc, MAX_ATTEMPTS_PER_PUSH, type OutgoingAttempt, type OutgoingDoc } from './schemas'
import type { SyncState } from './syncState'

/** What changed locally since the last successful push, already validated with the server's rules. */
export interface DocChanges {
  readonly docs: readonly OutgoingDoc[]
  /** Rows that the server schema would reject: never sent, counted for the adult. */
  readonly skipped: number
  /** Rows not sent because the server rejected this exact version before. */
  readonly quarantined: number
  /** Canonical JSON of the rewards / settings being pushed (snapshots once the server has them). */
  readonly rewardsJson?: string
  readonly settingsJson?: string
  readonly worldJson?: string
}

const validRows = <T,>(rows: unknown[], parse: (r: unknown) => { success: boolean; data?: T }): T[] =>
  rows.flatMap((r) => {
    const p = parse(r)
    return p.success && p.data !== undefined ? [p.data] : []
  })

/** Skills written before sync existed get `updatedAt` from their latest attempt (once, in the database). */
async function backfill(db: MatesDb, skills: SkillState[], fallback: number): Promise<SkillState[]> {
  if (skills.every((s) => s.updatedAt !== undefined)) return skills
  const attempts = await db.attempts.toArray()
  const filled = backfillSkillTimes(skills, attempts, fallback)
  await db.transaction('rw', db.skillStates, async () => {
    for (const row of filled) {
      const current = await db.skillStates.get(row.skillId)
      if (current && current.updatedAt === undefined) await db.skillStates.put({ ...current, updatedAt: row.updatedAt })
    }
  })
  const byId = new Map(filled.map((s) => [s.skillId, s] as const))
  return skills.map((s) => byId.get(s.skillId) ?? s)
}

export async function collectDocs(db: MatesDb, state: SyncState, now: number): Promise<DocChanges> {
  const [skillRows, factRows, rewardsRow, profileRow, worldRow] = await Promise.all([
    db.skillStates.toArray(),
    db.factStates.toArray(),
    db.rewards.get('me'),
    db.profile.get('me'),
    db.world.get(WORLD_ROW_ID),
  ])
  const unreadable = skillRows.length + factRows.length
  const skills = await backfill(db, validRows<SkillState>(skillRows, (r) => skillStateSchema.safeParse(r)), state.lastPushedAt || now)
  const facts = validRows(factRows, (r) => factStateSchema.safeParse(r))
  const since = state.lastPushedAt
  const raw: RawDoc[] = [
    ...skills.filter((s) => (s.updatedAt ?? 0) >= since).map(skillToDoc),
    ...facts.filter((f) => f.lastSeen >= since).map(factToDoc),
  ]
  const rewards = rewardsSchema.safeParse(rewardsRow)
  const canonical = normalizeRewards(rewards.success ? rewards.data : emptyRewards())
  const rewardsJson = JSON.stringify(canonical)
  if (rewardsJson !== state.syncedRewards) raw.push(rewardsToDoc(canonical, now))
  const profile = profileSchema.safeParse(profileRow)
  const settings = profile.success ? settingsToDoc(profile.data, now) : undefined
  const settingsJson = settings ? JSON.stringify(settings.data) : undefined
  if (settings && settingsJson !== state.syncedSettings) raw.push(settings)
  // The town row exists only once the town opened (created lazily): no row, nothing to send.
  const parsedWorld = worldRowSchema.safeParse(worldRow)
  const world = parsedWorld.success ? worldToDoc(parsedWorld.data, now) : undefined
  const worldJson = world ? JSON.stringify(world.data) : undefined
  if (world && worldJson !== state.syncedWorld) raw.push(world)

  const quarantine = new Set(state.quarantine)
  const isQuarantined = (d: RawDoc) => quarantine.has(docQuarantineId(d))
  const checked = raw.filter((d) => !isQuarantined(d)).map((d) => checkOutgoingDoc(d))
  const docs = checked.filter((d): d is OutgoingDoc => d !== null)
  return {
    docs,
    skipped: checked.length - docs.length + (unreadable - skills.length - facts.length),
    quarantined: raw.filter(isQuarantined).length,
    rewardsJson,
    ...(settingsJson === undefined ? {} : { settingsJson }),
    ...(worldJson === undefined ? {} : { worldJson }),
  }
}

export interface AttemptBatch {
  readonly attempts: readonly OutgoingAttempt[]
  readonly skipped: number
  readonly quarantined: number
  /** createdAt of the newest row read: the next cursor once this batch is on the server. */
  readonly cursor: number
  readonly full: boolean
}

/** The next <= 1000 attempts newer than `cursor`, validated; invalid rows are counted and skipped. */
export async function nextAttempts(db: MatesDb, cursor: number, quarantine: ReadonlySet<string>): Promise<AttemptBatch> {
  const rows = await db.attempts.where('createdAt').above(cursor).limit(MAX_ATTEMPTS_PER_PUSH).toArray()
  const fresh = rows.filter((r) => !quarantine.has(attemptQuarantineId(String(r.id))))
  const checked = fresh.map((r) => checkOutgoingAttempt(attemptToPush(r)))
  const attempts = checked.filter((a): a is OutgoingAttempt => a !== null)
  return {
    attempts,
    skipped: checked.length - attempts.length,
    quarantined: rows.length - fresh.length,
    cursor: rows.reduce((max, r) => Math.max(max, r.createdAt), cursor),
    full: rows.length === MAX_ATTEMPTS_PER_PUSH,
  }
}
