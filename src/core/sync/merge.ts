import type { DocData, DocKind, FactData, RewardsData, SkillData } from './schemas'

/*
 * The SAME merge rules as the server (server/src/lib/merge.ts); a contract test checks that both
 * agree on random inputs. `existing` is the left operand: on equal updatedAt it wins.
 */

export interface VersionedDoc<D extends DocData = DocData> {
  readonly data: D
  readonly updatedAt: number
}

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()

export function mergeDoc(kind: DocKind, existing: VersionedDoc, incoming: VersionedDoc): VersionedDoc {
  const updatedAt = Math.max(existing.updatedAt, incoming.updatedAt)
  const winner = incoming.updatedAt > existing.updatedAt ? incoming : existing
  switch (kind) {
    case 'skill':
    case 'fact': {
      const a = existing.data as SkillData | FactData
      const b = incoming.data as SkillData | FactData
      const base = winner.data as SkillData | FactData
      return { data: { ...base, attempts: Math.max(a.attempts, b.attempts), correct: Math.max(a.correct, b.correct) }, updatedAt }
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
      }
      return { data, updatedAt }
    }
    case 'settings':
      return { data: winner.data, updatedAt }
  }
}
