import { z } from 'zod'
import type { MatesDb } from '../storage/db'
import { WORLD_ROW_ID, worldRowSchema } from '../storage/worldRow'
import { normalizeWorld } from '../sync/mergeWorld'
import type { SyncState } from '../sync/syncState'

/** One grant of petals (coins): a whole, positive and bounded amount. */
export const MAX_PETAL_GRANT = 1000
export const petalGrantSchema = z.number().int().min(1).max(MAX_PETAL_GRANT)

/**
 * "Començar de zero" empties the rewards (petals back to 0). The town row is kept (what she owns,
 * wears and placed is not maths progress) but its coins-spent counter restarts too, otherwise the
 * old spending would swallow the next coins she earns. Runs inside the reset transaction; returns the
 * snapshot to store so this local reset is not pushed over the cloud copy (same rule as rewards).
 */
export async function rebaseWorldSpent(db: MatesDb): Promise<Pick<SyncState, 'syncedWorld'>> {
  const row = worldRowSchema.safeParse(await db.world.get(WORLD_ROW_ID))
  if (!row.success) return {}
  const next = { ...row.data, petalsSpent: 0 }
  await db.world.put(next)
  return { syncedWorld: JSON.stringify(normalizeWorld(next)) }
}
