import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import { CHARACTER_IDS, profileSchema, THEME_COLORS } from './db'
import { isPlayerDbName } from './playerDbs'

/** Tiny database listing the players of this device; their progress lives in their own databases. */
export const REGISTRY_DB_NAME = 'mates-registry'
export const REGISTRY_SCHEMA_VERSION = 1

export const playerSummarySchema = z.object({
  /** uuid; later the same id as the server profile. */
  id: z.uuid(),
  dbName: z.string().refine(isPlayerDbName, 'Nom de base de dades no vàlid'),
  name: profileSchema.shape.name,
  character: z.enum(CHARACTER_IDS),
  color: z.enum(THEME_COLORS),
  createdAt: z.number().int().nonnegative(),
  lastPlayedAt: z.number().int().nonnegative(),
})
export type PlayerSummary = z.infer<typeof playerSummarySchema>

interface RegistryMetaRow {
  key: string
  value: unknown
}

const REGISTRY_META = { schemaVersion: 'schemaVersion', lastPlayerId: 'lastPlayerId' } as const

export class RegistryDb extends Dexie {
  players!: Table<PlayerSummary, string>
  meta!: Table<RegistryMetaRow, string>

  constructor() {
    super(REGISTRY_DB_NAME)
    this.version(1).stores({ players: 'id', meta: 'key' })
    this.on('populate', (tx) => {
      void tx.table('meta').put({ key: REGISTRY_META.schemaVersion, value: REGISTRY_SCHEMA_VERSION })
    })
  }
}

let registry: RegistryDb | undefined

export function getRegistry(): RegistryDb {
  if (registry) return registry
  const created = new RegistryDb()
  created.on('versionchange', () => {
    created.close({ disableAutoOpen: true })
    if (registry === created) registry = undefined
  })
  registry = created
  return created
}

export function closeRegistry(): void {
  registry?.close({ disableAutoOpen: true })
  registry = undefined
}

/** Drops a registry that cannot be opened; it only holds an index that can be rebuilt. */
export async function deleteRegistry(): Promise<void> {
  closeRegistry()
  await Dexie.delete(REGISTRY_DB_NAME)
}

const byCreation = (a: PlayerSummary, b: PlayerSummary): number => a.createdAt - b.createdAt || a.id.localeCompare(b.id)

/** Valid players, oldest first; damaged rows are skipped and counted. */
export async function readPlayers(): Promise<{ players: PlayerSummary[]; damaged: number }> {
  const rows: unknown[] = await getRegistry().players.toArray()
  const players = rows.flatMap((row) => {
    const parsed = playerSummarySchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
  return { players: [...players].sort(byCreation), damaged: rows.length - players.length }
}

export async function savePlayer(player: PlayerSummary): Promise<PlayerSummary> {
  const valid = playerSummarySchema.parse(player)
  await getRegistry().players.put(valid)
  return valid
}

export async function savePlayers(players: readonly PlayerSummary[]): Promise<void> {
  const valid = players.map((p) => playerSummarySchema.parse(p))
  const reg = getRegistry()
  await reg.transaction('rw', reg.players, async () => {
    await reg.players.clear()
    await reg.players.bulkPut(valid)
  })
}

export async function removePlayer(id: string): Promise<void> {
  await getRegistry().players.delete(id)
}

export async function readLastPlayerId(): Promise<string | undefined> {
  const row = await getRegistry().meta.get(REGISTRY_META.lastPlayerId)
  const parsed = z.uuid().safeParse(row?.value)
  return parsed.success ? parsed.data : undefined
}

export async function writeLastPlayerId(id: string | undefined): Promise<void> {
  const reg = getRegistry()
  if (id === undefined) await reg.meta.delete(REGISTRY_META.lastPlayerId)
  else await reg.meta.put({ key: REGISTRY_META.lastPlayerId, value: z.uuid().parse(id) })
}
