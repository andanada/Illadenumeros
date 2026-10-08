import type { DocData, DocKind, FactData, RewardsData, SkillData } from './docSchemas.js'

export interface VersionedDoc {
  readonly data: DocData
  readonly updatedAt: number
}

/** Docs stored before the house and the daily challenge existed lack these lists. */
const list = (value: readonly string[] | undefined): readonly string[] => value ?? []
const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()

/**
 * Pure merge of two versions of the same doc. `existing` is the LEFT operand: on equal updatedAt it wins.
 *
 * - skill / fact: last-write-wins by `updatedAt` (ties keep existing), BUT the counters `attempts` and
 *   `correct` are monotonic: the merged doc takes the MAX of both versions. This repairs drift between
 *   devices that played offline concurrently (a counter never goes backwards) and keeps correct <= attempts.
 * - rewards: field by field. petals = max; stickers / daysPlayed / missionsDone = sorted set union. Never loses items.
 * - settings: plain last-write-wins.
 *
 * The result's updatedAt is the max of both. The operation is idempotent and associative (the leftmost
 * maximum wins, max and union are associative); the property tests check this.
 */
export function mergeDoc(kind: DocKind, existing: VersionedDoc, incoming: VersionedDoc): VersionedDoc {
  const updatedAt = Math.max(existing.updatedAt, incoming.updatedAt)
  const winner = incoming.updatedAt > existing.updatedAt ? incoming : existing
  switch (kind) {
    case 'skill':
    case 'fact': {
      const a = existing.data as SkillData | FactData
      const b = incoming.data as SkillData | FactData
      const base = winner.data as SkillData | FactData
      const data = { ...base, attempts: Math.max(a.attempts, b.attempts), correct: Math.max(a.correct, b.correct) }
      return { data, updatedAt }
    }
    case 'rewards': {
      const a = existing.data as RewardsData
      const b = incoming.data as RewardsData
      const data: RewardsData = {
        id: 'me',
        petals: Math.max(a.petals, b.petals),
        stickers: union(a.stickers, b.stickers),
        daysPlayed: union(a.daysPlayed, b.daysPlayed),
        missionsDone: union(a.missionsDone, b.missionsDone),
        decorOwned: union(list(a.decorOwned), list(b.decorOwned)),
        // Placement can be undone, so it is not a union: the newer version's choice wins.
        decorPlaced: [...list((winner.data as RewardsData).decorPlaced)],
        dailyDone: union(list(a.dailyDone), list(b.dailyDone)),
      }
      return { data, updatedAt }
    }
    case 'settings':
      return { data: winner.data, updatedAt }
  }
}
