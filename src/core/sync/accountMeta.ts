import { z } from 'zod'
import { openPlayerDb } from '../storage/playerDbs'
import { getRegistry, readPlayers } from '../storage/registry'
import { clearSyncState } from './syncState'

/**
 * Which family the local sync cursors belong to (registry meta). Logging into ANOTHER family, or
 * deleting the account, makes every cursor meaningless: they are cleared so the next sync uploads
 * everything again. Only the opaque family id is stored, never the email.
 */
const KEY = 'syncFamilyId'

export async function readSyncFamilyId(): Promise<string | undefined> {
  const parsed = z.string().min(1).max(100).safeParse((await getRegistry().meta.get(KEY))?.value)
  return parsed.success ? parsed.data : undefined
}

export async function forgetSyncData(): Promise<void> {
  const { players } = await readPlayers()
  await Promise.all(players.map((p) => clearSyncState(openPlayerDb(p.dbName))))
  await getRegistry().meta.bulkDelete([KEY, 'pendingDeletes'])
}

/** Called after every successful login/register/restore. */
export async function bindSyncFamily(familyId: string): Promise<void> {
  const current = await readSyncFamilyId()
  if (current === familyId) return
  if (current !== undefined) await forgetSyncData()
  await getRegistry().meta.put({ key: KEY, value: familyId })
}
