import { factStateSchema } from '../engine/leitner'
import { skillStateSchema } from '../engine/mastery'
import { readPlayerData } from '../progress/playerData'
import { useProgress } from '../progress/store'
import { serialised } from '../progress/writeQueue'
import { emptyRewards, profileSchema, rewardsSchema, type MatesDb } from '../storage/db'
import type { SyncResponse } from './api'
import { attemptFromPull, factFromDoc, factToDoc, normalizeRewards, rewardsFromDoc, SETTINGS_PROFILE_KEY, settingsFromDoc, skillFromDoc, skillToDoc } from './docs'
import { mergeDoc } from './merge'
import { checkAttemptData, checkDocData, DOC_KINDS, type DocKind, type FactData, type RewardsData, type SettingsData, type SkillData } from './schemas'
import { readSyncState, writeSyncState, type SyncState } from './syncState'

const isKind = (k: string): k is DocKind => (DOC_KINDS as readonly string[]).includes(k)

async function applySkill(db: MatesDb, data: SkillData, updatedAt: number): Promise<void> {
  const local = skillStateSchema.safeParse(await db.skillStates.get(data.skillId))
  if (!local.success) return void (await db.skillStates.put(skillFromDoc(data, updatedAt)))
  const mine = skillToDoc(local.data)
  const merged = mergeDoc('skill', { data: mine.data, updatedAt: mine.updatedAt }, { data, updatedAt })
  await db.skillStates.put(skillFromDoc(merged.data as SkillData, merged.updatedAt))
}

async function applyFact(db: MatesDb, data: FactData, updatedAt: number): Promise<void> {
  const local = factStateSchema.safeParse(await db.factStates.get(data.factKey))
  if (!local.success) return void (await db.factStates.put(factFromDoc(data)))
  const mine = factToDoc(local.data)
  const merged = mergeDoc('fact', { data: mine.data, updatedAt: mine.updatedAt }, { data, updatedAt })
  await db.factStates.put(factFromDoc(merged.data as FactData))
}

async function applyRewards(db: MatesDb, data: RewardsData, updatedAt: number, snapshot: string | undefined): Promise<Partial<SyncState>> {
  const local = rewardsSchema.safeParse(await db.rewards.get('me'))
  const mine = normalizeRewards(local.success ? local.data : emptyRewards())
  // A local change not pushed yet (e.g. a re-arranged house) must not lose the placement to the older server copy.
  const pending = snapshot !== undefined && JSON.stringify(mine) !== snapshot
  const merged = mergeDoc('rewards', { data: mine, updatedAt: pending ? updatedAt + 1 : 0 }, { data, updatedAt })
  await db.rewards.put(rewardsFromDoc(merged.data as RewardsData))
  // The snapshot is the SERVER version: local extras (played meanwhile) still differ and get pushed.
  return { syncedRewards: JSON.stringify(normalizeRewards(rewardsFromDoc(data))) }
}

/** Settings are last-write-wins; a local change not yet pushed (local != snapshot) is kept. */
async function applySettings(db: MatesDb, key: string, data: SettingsData, snapshot: string | undefined): Promise<Partial<SyncState>> {
  if (key !== SETTINGS_PROFILE_KEY) return {}
  const profile = profileSchema.safeParse(await db.profile.get('me'))
  if (!profile.success) return {}
  const local = JSON.stringify({ diagnosticDone: profile.data.diagnosticDone })
  if (snapshot !== undefined && local !== snapshot) return {}
  const next = { ...profile.data, ...settingsFromDoc(data) }
  await db.profile.put(next)
  return { syncedSettings: JSON.stringify({ diagnosticDone: next.diagnosticDone }) }
}

/** Counts remote items that failed validation (never written). */
async function applyItems(db: MatesDb, page: SyncResponse, snapshot: string | undefined, syncedRewardsSnapshot: string | undefined): Promise<{ patch: Partial<SyncState>; invalid: number }> {
  let patch: Partial<SyncState> = {}
  let invalid = 0
  for (const doc of page.docs) {
    const checked = isKind(doc.kind) ? checkDocData(doc.kind, doc.data) : { ok: false as const }
    if (!checked.ok || !isKind(doc.kind)) {
      invalid += 1
      continue
    }
    if (doc.kind === 'skill') await applySkill(db, checked.data as SkillData, doc.updatedAt)
    else if (doc.kind === 'fact') await applyFact(db, checked.data as FactData, doc.updatedAt)
    else if (doc.kind === 'rewards') patch = { ...patch, ...(await applyRewards(db, checked.data as RewardsData, doc.updatedAt, patch.syncedRewards ?? syncedRewardsSnapshot)) }
    else patch = { ...patch, ...(await applySettings(db, doc.key, checked.data as SettingsData, patch.syncedSettings ?? snapshot)) }
  }
  const attempts = page.attempts.flatMap((a) => {
    const data = checkAttemptData(a.data)
    return data ? [attemptFromPull({ id: a.id, data })] : []
  })
  invalid += page.attempts.length - attempts.length
  if (attempts.length > 0) await db.attempts.bulkPut(attempts)
  return { patch, invalid }
}

/**
 * Applies one pull page (merge with the local rows) and moves `syncSeq` to the page's seq, all in ONE
 * Dexie transaction, queued with the progress writes so an answer being saved can never interleave.
 * Then refreshes the in-memory store if that player is playing. Returns the number of invalid remote items.
 */
export function applyPage(db: MatesDb, playerId: string, page: SyncResponse, extra: Partial<SyncState> = {}): Promise<number> {
  return serialised(async () => {
    const tables = [db.skillStates, db.factStates, db.rewards, db.profile, db.attempts, db.meta]
    const invalid = await db.transaction('rw', tables, async () => {
      if (Object.keys(extra).length > 0) await writeSyncState(db, extra)
      const { syncedSettings, syncedRewards } = await readSyncState(db)
      const { patch, invalid: bad } = await applyItems(db, page, syncedSettings, syncedRewards)
      await writeSyncState(db, { ...patch, syncSeq: page.seq })
      return bad
    })
    const touched = page.docs.length > 0 || page.attempts.length > 0
    if (touched && useProgress.getState().activePlayerId === playerId) {
      const data = await readPlayerData(db)
      if (useProgress.getState().activePlayerId === playerId) useProgress.setState(data)
    }
    return invalid
  })
}
