import { SCENE_IDS, type Placement, type SceneId, type WorldData } from './worldSchema.js'

/*
 * Merge of two versions of the world doc. `a` is the EXISTING (left) operand: on ties it wins.
 * Mirrored byte for byte in src/core/sync/mergeWorld.ts (contract test with fast-check).
 *
 * - owned, pets: sorted set union (nothing bought or adopted is ever lost).
 * - avatar: last-writer-wins by `avatarUpdatedAt` (NOT by the doc's updatedAt).
 * - placed: last-writer-wins PER SCENE by `placedAt[scene]` (a missing time counts as -1, so
 *   any timed side wins). The winner's list is taken whole, also when it is empty (cleared scene).
 * - petalsSpent: max (monotonic counter; coins = max(0, petals - petalsSpent)).
 * Scenes are emitted in SCENE_IDS order, so equal content always serialises to equal JSON.
 */

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()

const timeOf = (doc: WorldData, scene: SceneId): number => doc.placedAt[scene] ?? -1

function mergeScenes(a: WorldData, b: WorldData): Pick<WorldData, 'placed' | 'placedAt'> {
  const placed: Partial<Record<SceneId, Placement[]>> = {}
  const placedAt: Partial<Record<SceneId, number>> = {}
  for (const scene of SCENE_IDS) {
    const winner = timeOf(b, scene) > timeOf(a, scene) ? b : a
    const list = winner.placed[scene]
    const at = winner.placedAt[scene]
    if (list !== undefined) placed[scene] = list
    if (at !== undefined) placedAt[scene] = at
  }
  return { placed, placedAt }
}

export function mergeWorld(a: WorldData, b: WorldData): WorldData {
  const avatarWinner = b.avatarUpdatedAt > a.avatarUpdatedAt ? b : a
  const { placed, placedAt } = mergeScenes(a, b)
  return {
    id: 'world',
    avatar: avatarWinner.avatar,
    owned: union(a.owned, b.owned),
    placed,
    placedAt,
    pets: union(a.pets, b.pets),
    avatarUpdatedAt: avatarWinner.avatarUpdatedAt,
    petalsSpent: Math.max(a.petalsSpent, b.petalsSpent),
  }
}
