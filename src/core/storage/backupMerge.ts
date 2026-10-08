import type { FactState } from '../engine/leitner'
import type { SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import type { ProgressData } from './backupSchema'
import type { Rewards } from './db'

export type ImportStrategy = 'replace' | 'keep-newer'

/** Latest attempt time per skill: skill states carry no timestamp of their own. */
function lastActivity(attempts: readonly Attempt[]): ReadonlyMap<string, number> {
  // A fresh local map (inputs are untouched); copying it per attempt would be O(n²) for big backups.
  const latest = new Map<string, number>()
  attempts.forEach((a) => latest.set(a.skillId, Math.max(latest.get(a.skillId) ?? -Infinity, a.createdAt)))
  return latest
}

/** Generic "one row per key, keep the newer one; ties keep the local row". */
function mergeByKey<T>(local: readonly T[], incoming: readonly T[], key: (row: T) => string, incomingIsNewer: (local: T, incoming: T) => boolean): T[] {
  const merged = new Map(local.map((row) => [key(row), row]))
  incoming.forEach((row) => {
    const current = merged.get(key(row))
    if (current === undefined || incomingIsNewer(current, row)) merged.set(key(row), row)
  })
  return [...merged.values()]
}

function mergeSkills(local: ProgressData, incoming: ProgressData): SkillState[] {
  const localSeen = lastActivity(local.attempts)
  const incomingSeen = lastActivity(incoming.attempts)
  return mergeByKey(local.skillStates, incoming.skillStates, (s) => s.skillId, (l, i) => {
    const lt = localSeen.get(l.skillId)
    const it = incomingSeen.get(i.skillId)
    if (lt !== undefined && it !== undefined && lt !== it) return it > lt
    if (lt === undefined && it !== undefined) return true
    if (lt !== undefined && it === undefined) return false
    // No usable timestamps: the side with more practice is the more recent one.
    return i.attempts > l.attempts
  })
}

const mergeFacts = (local: readonly FactState[], incoming: readonly FactState[]): FactState[] =>
  mergeByKey(local, incoming, (f) => f.factKey, (l, i) => i.lastSeen > l.lastSeen)

/** Attempts are immutable records: the union by id loses nothing. */
const mergeAttempts = (local: readonly Attempt[], incoming: readonly Attempt[]): Attempt[] =>
  mergeByKey(local, incoming, (a) => a.id, () => false)

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()

/** Rewards only ever grow, so the merge keeps the larger petal count and every sticker and day. */
function mergeRewards(local: Rewards | null, incoming: Rewards | null): Rewards | null {
  if (!local || !incoming) return local ?? incoming
  return {
    id: 'me',
    petals: Math.max(local.petals, incoming.petals),
    stickers: union(local.stickers, incoming.stickers),
    daysPlayed: union(local.daysPlayed, incoming.daysPlayed),
    missionsDone: union(local.missionsDone, incoming.missionsDone),
    decorOwned: union(local.decorOwned, incoming.decorOwned),
    decorPlaced: local.decorPlaced.length > 0 ? local.decorPlaced : incoming.decorPlaced,
    dailyDone: union(local.dailyDone, incoming.dailyDone),
  }
}

/** Pure: the data to write for a given strategy. Never mutates its inputs. */
export function mergeProgress(local: ProgressData, incoming: ProgressData, strategy: ImportStrategy): ProgressData {
  if (strategy === 'replace') return incoming
  const profile = local.profile
    ? { ...local.profile, diagnosticDone: local.profile.diagnosticDone || (incoming.profile?.diagnosticDone ?? false) }
    : incoming.profile
  return {
    profile,
    skillStates: mergeSkills(local, incoming),
    factStates: mergeFacts(local.factStates, incoming.factStates),
    attempts: mergeAttempts(local.attempts, incoming.attempts),
    rewards: mergeRewards(local.rewards, incoming.rewards),
  }
}

export const isEmptyProgress = (data: ProgressData): boolean =>
  data.profile === null && data.skillStates.length === 0 && data.factStates.length === 0 && data.attempts.length === 0 && data.rewards === null
