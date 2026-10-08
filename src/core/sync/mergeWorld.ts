import { SCENE_IDS, type Placement, type SceneId } from '../../world/model/types'
import { worldDataSchema, type WorldData } from './worldSchemas'

/*
 * The SAME world merge as the server (server/src/lib/mergeWorld.ts); the contract test checks both
 * agree on random docs. `a` is the EXISTING (left) operand: on ties it wins.
 *
 * - owned, pets: sorted set union (nothing bought or adopted is ever lost).
 * - avatar: last-writer-wins by `avatarUpdatedAt`.
 * - placed: last-writer-wins PER SCENE by `placedAt[scene]` (missing = -1); the winner's list is
 *   taken whole, also when absent (a cleared scene stays cleared).
 * - petalsSpent: max. Coins = max(0, rewards.petals - petalsSpent): rewards keep their max-merge and
 *   a spend on one device can never be undone by another device's (higher) petals.
 * Scenes come out in SCENE_IDS order, so equal content always serialises to equal JSON.
 */

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()

const timeOf = (doc: WorldData, scene: SceneId): number => doc.placedAt[scene] ?? -1

function mergeScenes(a: WorldData, b: WorldData): Pick<WorldData, 'placed' | 'placedAt'> {
  const entries = SCENE_IDS.map((scene) => {
    const winner = timeOf(b, scene) > timeOf(a, scene) ? b : a
    return { scene, list: winner.placed[scene], at: winner.placedAt[scene] }
  })
  const placed: Partial<Record<SceneId, Placement[]>> = Object.fromEntries(entries.flatMap((e) => (e.list === undefined ? [] : [[e.scene, e.list]])))
  const placedAt: Partial<Record<SceneId, number>> = Object.fromEntries(entries.flatMap((e) => (e.at === undefined ? [] : [[e.scene, e.at]])))
  return { placed, placedAt }
}

export function mergeWorld(a: WorldData, b: WorldData): WorldData {
  const avatarWinner = b.avatarUpdatedAt > a.avatarUpdatedAt ? b : a
  return {
    id: 'world',
    avatar: avatarWinner.avatar,
    owned: union(a.owned, b.owned),
    ...mergeScenes(a, b),
    pets: union(a.pets, b.pets),
    avatarUpdatedAt: avatarWinner.avatarUpdatedAt,
    petalsSpent: Math.max(a.petalsSpent, b.petalsSpent),
  }
}

/**
 * Canonical form, like the server stores it: keys in schema order (zod output), sets sorted and
 * unique, scenes in fixed order. Equal content gives equal JSON (used for the sync snapshots).
 */
export function normalizeWorld(w: WorldData): WorldData {
  const parsed = worldDataSchema.safeParse(w)
  const data = parsed.success ? parsed.data : w
  return mergeWorld(data, data)
}
