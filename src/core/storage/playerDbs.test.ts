import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { databaseNames, wipeAllDatabases } from '../../test/idb'
import { DB_NAME } from './db'
import {
  deletePlayerDb,
  getActiveDbName,
  getDb,
  isPlayerDbName,
  NoActivePlayerError,
  openPlayerDb,
  playerDbName,
  setActivePlayerDb,
} from './playerDbs'

const ID = '33333333-3333-4333-8333-333333333333'

afterEach(async () => {
  setActivePlayerDb(undefined)
  await wipeAllDatabases()
})

describe('player databases', () => {
  it('names: the legacy database plus one `mates-magiques-<uuid>` per new player', () => {
    expect(playerDbName(ID)).toBe(`mates-magiques-${ID}`)
    expect(isPlayerDbName(DB_NAME)).toBe(true)
    expect(isPlayerDbName(playerDbName(ID))).toBe(true)
    expect(isPlayerDbName('mates-registry')).toBe(false)
    expect(isPlayerDbName('mates-magiques-nope')).toBe(false)
    expect(() => playerDbName('nope')).toThrow()
  })

  it('opens each database once', () => {
    expect(openPlayerDb(playerDbName(ID))).toBe(openPlayerDb(playerDbName(ID)))
  })

  it('getDb() follows the active player and fails loudly when there is none', () => {
    expect(() => getDb()).toThrow(NoActivePlayerError)
    setActivePlayerDb(playerDbName(ID))
    expect(getActiveDbName()).toBe(playerDbName(ID))
    expect(getDb().name).toBe(playerDbName(ID))
    setActivePlayerDb(DB_NAME)
    expect(getDb().name).toBe(DB_NAME)
  })

  it('deleting removes the whole database and a later open starts empty', async () => {
    const name = playerDbName(ID)
    await openPlayerDb(name).profile.put({ id: 'me', name: 'Pau', character: 'blau', color: 'blau', diagnosticDone: true, createdAt: 1 })
    expect(await databaseNames()).toContain(name)

    await deletePlayerDb(name)
    expect(await Dexie.exists(name)).toBe(false)
    expect(await databaseNames()).not.toContain(name)
    expect(await openPlayerDb(name).profile.count()).toBe(0)
  })

  it('another tab deleting the database releases our handle instead of blocking it', async () => {
    const name = playerDbName(ID)
    const ours = openPlayerDb(name)
    await ours.open()
    await Dexie.delete(name)
    expect(ours.isOpen()).toBe(false)
    expect(openPlayerDb(name)).not.toBe(ours)
  })
})
