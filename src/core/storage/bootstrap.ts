import { DB_NAME, profileSchema } from './db'
import { readMeta, setPlayerId } from './meta'
import { listPlayerDbNames, openPlayerDb, playerIdFromDbName } from './playerDbs'
import { deleteRegistry, readPlayers, savePlayers, type PlayerSummary } from './registry'

/**
 * Builds a registry entry from a player database that has a valid profile. The id comes from
 * the database itself (meta `playerId`, or the uuid in its name); the legacy database gets a new
 * uuid, written into its meta so that a later rebuild keeps it.
 */
async function summaryFromDb(dbName: string): Promise<PlayerSummary | undefined> {
  const database = openPlayerDb(dbName)
  const profile = profileSchema.safeParse(await database.profile.get('me'))
  if (!profile.success) return undefined
  // Read-or-claim in ONE transaction: two tabs adopting at the same time end up with the same id.
  const id = await database.transaction('rw', database.meta, async () => {
    const { playerId } = await readMeta(database)
    if (playerId) return playerId
    const claimed = playerIdFromDbName(dbName) ?? crypto.randomUUID()
    await setPlayerId(database, claimed)
    return claimed
  })
  const { name, character, color, createdAt } = profile.data
  return { id, dbName, name, character, color, createdAt, lastPlayedAt: createdAt }
}

/** Finds every player database on the device (the legacy one included) that holds a profile. */
async function discoverPlayers(): Promise<PlayerSummary[]> {
  const names = await listPlayerDbNames()
  const found = await Promise.all(names.map((name) => summaryFromDb(name).catch(() => undefined)))
  const players = found.filter((p): p is PlayerSummary => p !== undefined)
  // Two databases claiming the same id (should never happen): keep the first, by name.
  const unique = new Map(players.map((p) => [p.id, p] as const))
  return [...unique.values()].sort((a, b) => a.createdAt - b.createdAt || (a.dbName === DB_NAME ? -1 : 1))
}

async function readOrReset(): Promise<PlayerSummary[]> {
  try {
    return (await readPlayers()).players
  } catch {
    // The registry cannot be opened (damaged, or from a newer app): it is only an index.
    await deleteRegistry()
    return []
  }
}

/**
 * Players of this device. On the first run after the multi-player update, the existing
 * single-player database is adopted as the first player, without moving any row. If the
 * registry is empty or damaged, it is rebuilt from the player databases found.
 */
async function loadOrRebuild(): Promise<PlayerSummary[]> {
  const listed = await readOrReset()
  if (listed.length > 0) return listed
  const discovered = await discoverPlayers()
  await savePlayers(discovered)
  return discovered
}

/** Shared while running: two starts at once (StrictMode, quick reloads) must not adopt twice. */
let inFlight: Promise<PlayerSummary[]> | undefined

export function loadPlayers(): Promise<PlayerSummary[]> {
  inFlight ??= loadOrRebuild().finally(() => {
    inFlight = undefined
  })
  return inFlight
}
