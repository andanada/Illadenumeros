import { beforeEach, describe, expect, it } from 'vitest'
import type { MatesDb } from './db'
import { activateTestPlayer } from '../../test/playerDb'
import { BACKUP_REMINDER_DAYS, backupIsDue, DEFAULT_DAILY_MINUTES, readDailyMinutes, readMeta, setDailyMinutes, setLastBackupAt } from './meta'

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

describe('daily maths minutes (town setting)', () => {
  it('defaults to 12 when nothing is stored or the value is damaged', async () => {
    expect(DEFAULT_DAILY_MINUTES).toBe(12)
    expect(await readDailyMinutes(db)).toBe(12)
    await db.meta.put({ key: 'townDailyMinutes', value: 99 })
    expect(await readDailyMinutes(db)).toBe(12)
    expect((await readMeta(db)).townDailyMinutes).toBeUndefined()
  })

  it('stores one of 8 / 12 / 16 / 20 and reads it back', async () => {
    await setDailyMinutes(db, 16)
    expect(await readDailyMinutes(db)).toBe(16)
    expect((await readMeta(db)).townDailyMinutes).toBe(16)
  })

  it('refuses any other value', async () => {
    await expect(setDailyMinutes(db, 10)).rejects.toThrow()
    expect(await readDailyMinutes(db)).toBe(12)
  })
})
