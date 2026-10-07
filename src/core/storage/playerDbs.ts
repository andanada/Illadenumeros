import Dexie from 'dexie'
import { z } from 'zod'
import { DB_NAME, MatesDb } from './db'

/**
 * One Dexie database per player. The legacy `mates-magiques` database belongs to the first
 * (adopted) player; every new player gets `mates-magiques-<uuid>`.
 */
export const PLAYER_DB_PREFIX = `${DB_NAME}-`

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PLAYER_DB_RE = new RegExp(`^${DB_NAME}(-${UUID_PATTERN})?$`)

export const playerDbName = (playerId: string): string => `${PLAYER_DB_PREFIX}${z.uuid().parse(playerId)}`

export const isPlayerDbName = (name: string): boolean => PLAYER_DB_RE.test(name)

/** The uuid embedded in a `mates-magiques-<uuid>` name (undefined for the legacy database). */
export const playerIdFromDbName = (name: string): string | undefined =>
  name.startsWith(PLAYER_DB_PREFIX) && isPlayerDbName(name) ? name.slice(PLAYER_DB_PREFIX.length) : undefined

export class NoActivePlayerError extends Error {
  constructor() {
    super('No hi ha cap jugador actiu')
    this.name = 'NoActivePlayerError'
  }
}

const cache = new Map<string, MatesDb>()
let activeDbName: string | undefined

/** Opens (once) the database of a player. Connections are reused until closed. */
export function openPlayerDb(name: string): MatesDb {
  const cached = cache.get(name)
  if (cached) return cached
  const database = new MatesDb(name)
  // Another tab upgrades or deletes this database: release it and never silently reopen the
  // old handle (a reopen after a delete would recreate an empty database).
  database.on('versionchange', () => {
    database.close({ disableAutoOpen: true })
    if (cache.get(name) === database) cache.delete(name)
  })
  cache.set(name, database)
  return database
}

export function setActivePlayerDb(name: string | undefined): void {
  activeDbName = name
}

export const getActiveDbName = (): string | undefined => activeDbName

/** The ACTIVE player's database. Throws when nobody is playing, so no write can land in the wrong place. */
export function getDb(): MatesDb {
  if (activeDbName === undefined) throw new NoActivePlayerError()
  return openPlayerDb(activeDbName)
}

export function closePlayerDb(name: string): void {
  cache.get(name)?.close({ disableAutoOpen: true })
  cache.delete(name)
}

export function closeAllPlayerDbs(): void {
  ;[...cache.keys()].forEach(closePlayerDb)
}

/** Closes and deletes the whole database of a player. */
export async function deletePlayerDb(name: string): Promise<void> {
  closePlayerDb(name)
  if (activeDbName === name) activeDbName = undefined
  await Dexie.delete(name)
}

/** Player databases present on this device (legacy included), without creating any. */
export async function listPlayerDbNames(): Promise<string[]> {
  const names = await Dexie.getDatabaseNames().catch(() => [] as string[])
  const found = names.filter(isPlayerDbName)
  if (found.includes(DB_NAME)) return found
  const legacy = await Dexie.exists(DB_NAME).catch(() => false)
  return legacy ? [DB_NAME, ...found] : found
}
