import { beforeEach, describe, expect, it } from 'vitest'
import type { MatesDb } from './db'
import { activateTestPlayer } from '../../test/playerDb'
import { BACKUP_REMINDER_DAYS, backupIsDue, readMeta, setLastBackupAt } from './meta'

const DAY = 24 * 60 * 60 * 1000

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await db.meta.clear()
})

describe('backup reminder', () => {
  it('is due when no copy was ever saved', () => {
    expect(backupIsDue(undefined, 1_000)).toBe(true)
  })

  it('is not due exactly at 14 days, and is due right after', () => {
    expect(BACKUP_REMINDER_DAYS).toBe(14)
    expect(backupIsDue(0, 14 * DAY)).toBe(false)
    expect(backupIsDue(0, 14 * DAY + 1)).toBe(true)
  })
})

describe('setLastBackupAt', () => {
  it('stores the date in meta and readMeta returns it', async () => {
    await setLastBackupAt(db, 1_759_000_000_000)
    expect((await readMeta(db)).lastBackupAt).toBe(1_759_000_000_000)
  })

  it('refuses an invalid timestamp', async () => {
    await expect(setLastBackupAt(db, -5)).rejects.toThrow()
  })

  it('ignores unknown meta keys', async () => {
    await db.meta.put({ key: 'altres', value: 3 })
    expect(await readMeta(db)).toEqual({})
  })
})
