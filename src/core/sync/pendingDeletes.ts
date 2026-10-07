import { z } from 'zod'
import { getRegistry } from '../storage/registry'

/**
 * Players deleted on this device while logged in whose server profile could not be deleted yet
 * (offline). Kept in the registry meta and flushed on the next sync.
 */
const KEY = 'pendingDeletes'

export async function readPendingDeletes(): Promise<string[]> {
  const row = await getRegistry().meta.get(KEY)
  const list = z.array(z.unknown()).safeParse(row?.value)
  if (!list.success) return []
  return list.data.flatMap((v) => {
    const id = z.uuid().safeParse(v)
    return id.success ? [id.data] : []
  })
}

async function write(ids: readonly string[]): Promise<void> {
  await getRegistry().meta.put({ key: KEY, value: [...new Set(ids)] })
}

export async function addPendingDelete(id: string): Promise<void> {
  const valid = z.uuid().parse(id)
  await write([...(await readPendingDeletes()), valid])
}

export async function removePendingDelete(id: string): Promise<void> {
  await write((await readPendingDeletes()).filter((x) => x !== id))
}
