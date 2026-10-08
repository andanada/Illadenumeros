import type { FactState } from '../engine/leitner'
import type { SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import type { Profile, Rewards } from '../storage/db'
import type { WorldRow } from '../storage/worldRow'
import { normalizeWorld } from './mergeWorld'
import type { AttemptData, DocKind, FactData, ProfileInput, RewardsData, SettingsData, SkillData, WorldData } from './schemas'

/*
 * Pure mapping between the local Dexie rows and the server sync formats (server/README.md, "mapeo"):
 *   skillStates -> kind 'skill', key = skillId, updatedAt = SkillState.updatedAt (kept outside `data`)
 *   factStates  -> kind 'fact',  key = factKey, updatedAt = lastSeen
 *   rewards     -> kind 'rewards', key 'me'
 *   profile     -> PUT /api/profiles/:id (name, character, color, createdAt) + kind 'settings', key 'profile' ({diagnosticDone})
 *   attempts    -> { id, createdAt, data: attempt without id }
 *   world       -> kind 'world', key 'world' (the town row, canonical form; no own timestamp: snapshot like rewards)
 * Outgoing values are NOT validated here: the engine checks them with schemas.ts before sending.
 */

export const SETTINGS_PROFILE_KEY = 'profile'
export const WORLD_DOC_KEY = 'world'

export interface RawDoc<D = unknown> {
  readonly kind: DocKind
  readonly key: string
  readonly data: D
  readonly updatedAt: number
}

export interface RawAttempt {
  readonly id: string
  readonly data: Omit<Attempt, 'id'>
  readonly createdAt: number
}

const epoch = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)

export function skillToDoc(skill: SkillState): RawDoc<Omit<SkillState, 'updatedAt'>> {
  const { updatedAt, ...data } = skill
  return { kind: 'skill', key: skill.skillId, data, updatedAt: epoch(updatedAt ?? 0) }
}

export const factToDoc = (fact: FactState): RawDoc<FactState> => ({ kind: 'fact', key: fact.factKey, data: fact, updatedAt: epoch(fact.lastSeen) })

export const rewardsToDoc = (rewards: Rewards, updatedAt: number): RawDoc<Rewards> => ({ kind: 'rewards', key: 'me', data: rewards, updatedAt })

export const settingsToDoc = (profile: Pick<Profile, 'diagnosticDone'>, updatedAt: number): RawDoc<{ diagnosticDone: boolean }> => ({
  kind: 'settings',
  key: SETTINGS_PROFILE_KEY,
  data: { diagnosticDone: profile.diagnosticDone },
  updatedAt,
})

export function attemptToPush(attempt: Attempt): RawAttempt {
  const { id, ...data } = attempt
  return { id, data, createdAt: epoch(attempt.createdAt) }
}

export const profileToInput = (p: Pick<Profile, 'name' | 'character' | 'color' | 'createdAt'>): ProfileInput => ({
  name: p.name,
  character: p.character,
  color: p.color,
  createdAt: epoch(p.createdAt),
})

export const skillFromDoc = (data: SkillData, updatedAt: number): SkillState => ({ ...data, updatedAt })

export const factFromDoc = (data: FactData): FactState => ({ ...data })

export const rewardsFromDoc = (data: RewardsData): Rewards => ({ ...data, id: 'me' })

export function settingsFromDoc(data: SettingsData): { diagnosticDone?: boolean } {
  return typeof data.diagnosticDone === 'boolean' ? { diagnosticDone: data.diagnosticDone } : {}
}

export const worldToDoc = (row: WorldRow, updatedAt: number): RawDoc<WorldData> => ({ kind: 'world', key: WORLD_DOC_KEY, data: normalizeWorld(row), updatedAt })

export const worldFromDoc = (data: WorldData): WorldRow => normalizeWorld(data)

export const attemptFromPull = (a: { id: string; data: AttemptData }): Attempt => ({ ...a.data, id: a.id })

/**
 * Rows written before sync existed have no `updatedAt`. Gives them the time of their latest attempt
 * (or `fallback`). Returns ONLY the rows that changed, as new objects.
 */
export function backfillSkillTimes(
  skills: readonly SkillState[],
  attempts: readonly Pick<Attempt, 'skillId' | 'createdAt'>[],
  fallback: number,
): SkillState[] {
  // Local, never-shared index (linear even with 200k attempts).
  const latest = new Map<string, number>()
  for (const a of attempts) if (a.createdAt > (latest.get(a.skillId) ?? -1)) latest.set(a.skillId, a.createdAt)
  return skills.filter((s) => s.updatedAt === undefined).map((s) => ({ ...s, updatedAt: epoch(latest.get(s.skillId) ?? fallback) }))
}

/** Rewards in the server's canonical form (lists = sorted set), so equal content gives equal JSON. */
export const normalizeRewards = (r: Rewards): Rewards => ({
  id: 'me',
  petals: r.petals,
  stickers: [...new Set(r.stickers)].sort(),
  daysPlayed: [...new Set(r.daysPlayed)].sort(),
  missionsDone: [...new Set(r.missionsDone)].sort(),
})

/** Small stable hash (djb2) so a quarantine entry names one exact content without storing it. */
function hash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/** Identifies one version of a doc: a later change of the same doc is tried again. */
export const docQuarantineId = (doc: RawDoc): string =>
  doc.kind === 'skill' || doc.kind === 'fact' ? `${doc.kind}:${doc.key}@${doc.updatedAt}` : `${doc.kind}:${doc.key}#${hash(JSON.stringify(doc.data))}`

export const attemptQuarantineId = (id: string): string => `attempt:${id}`
