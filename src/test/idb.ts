import Dexie from 'dexie'
import { closeAllPlayerDbs } from '../core/storage/playerDbs'
import { closeRegistry } from '../core/storage/registry'

/** Closes every cached connection and deletes every IndexedDB database of the test file. */
export async function wipeAllDatabases(): Promise<void> {
  closeAllPlayerDbs()
  closeRegistry()
  const names = (await indexedDB.databases()).flatMap((info) => (info.name ? [info.name] : []))
  await Promise.all(names.map((name) => Dexie.delete(name)))
}

export const databaseNames = async (): Promise<string[]> =>
  (await indexedDB.databases()).flatMap((info) => (info.name ? [info.name] : [])).sort()
