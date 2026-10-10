import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey, useProgress } from '../../core/progress/store'
import type { MatesDb } from '../../core/storage/db'
import { activateTestPlayer, resetStoreForTest } from '../../test/playerDb'
import { BOARD_META_KEY, newBoardState } from '../board/boardState'
import { resetWorldStoreForTest } from '../data/worldStore'
import { REQUESTS_META_KEY } from './dayState'
import type { GovernorContext } from './governor'
import { dismissReveal, openDay, resetRequestStoreForTest, resolveAt, syncRequests, tickPlayed, useRequestStore, wakeRequests } from './requestStore'

const TASKS = [
  { place: 'recreatius', count: 1, kind: 'calentament', neighbour: 'en-kofi' },
  { place: 'botiga', count: 2, kind: 'repte', neighbour: 'senyora-pilar' },
] as const

let db: MatesDb
const DAY = todayKey()
const T0 = 5_000_000
const ctx = (now = T0): GovernorContext => ({
  now,
  seed: 3,
  places: [
    { id: 'botiga', skills: ['A3', 'A4'] },
    { id: 'recreatius', skills: ['A3'] },
  ],
  core: new Set(['A4']),
  review: new Set(['A3']),
})

beforeEach(() => {
  db = activateTestPlayer()
  resetWorldStoreForTest()
  resetRequestStoreForTest()
})
afterEach(() => resetRequestStoreForTest())

describe('openDay', () => {
  it('builds today once, stores it with its first requests; the plan is not rebuilt the same day', async () => {
    const plan = vi.fn(() => TASKS)
    const day = await openDay(DAY, plan, ctx())
    expect(day?.board.tasks).toEqual(TASKS)
    expect(day?.live.length).toBeGreaterThan(0)
    expect((await db.meta.get(REQUESTS_META_KEY))?.value).toEqual(day)
    resetRequestStoreForTest()
    const again = await openDay(DAY, () => [], ctx())
    expect(again?.board.tasks).toEqual(TASKS)
    expect(plan).toHaveBeenCalledOnce()
  })

  it('a new day starts fresh; a damaged stored day is replaced', async () => {
    await openDay('2020-01-01', () => TASKS, ctx())
    resetRequestStoreForTest()
    expect((await openDay(DAY, () => TASKS, ctx()))?.board.done).toEqual({})
    await db.meta.put({ key: REQUESTS_META_KEY, value: { day: DAY, board: 'x' } })
    resetRequestStoreForTest()
    expect((await openDay(DAY, () => TASKS, ctx()))?.board.tasks).toEqual(TASKS)
  })

  it('carries over a day already played on the old errand board (progress and gift), leaving the old key alone', async () => {
    const old = { ...newBoardState(DAY, TASKS), done: { botiga: 1 } }
    await db.meta.put({ key: BOARD_META_KEY, value: old })
    const day = await openDay(DAY, () => [], ctx())
    expect(day?.board.done).toEqual({ botiga: 1 })
    expect(day?.seconds).toBe(72)
    expect((await db.meta.get(BOARD_META_KEY))?.value).toEqual(old)
    await db.meta.put({ key: BOARD_META_KEY, value: { day: DAY, tasks: 'broken' } })
    resetRequestStoreForTest()
    await db.meta.delete(REQUESTS_META_KEY)
    expect((await openDay(DAY, () => TASKS, ctx()))?.board.tasks).toEqual(TASKS)
  })

  it('nobody playing: nothing opens', async () => {
    resetStoreForTest()
    expect(await openDay(DAY, () => TASKS, ctx())).toBeUndefined()
  })
})

describe('resolveAt', () => {
  it('ticks the place, fills the jar, persists; the last one claims a free gift and marks the day done', async () => {
    await openDay(DAY, () => TASKS, ctx())
    await resolveAt('botiga', true, ctx(T0 + 1))
    expect(useRequestStore.getState().day?.board.done).toEqual({ botiga: 1 })
    expect(useRequestStore.getState().day?.seconds).toBe(72)
    expect((await db.meta.get(REQUESTS_META_KEY))?.value).toMatchObject({ board: { done: { botiga: 1 } } })
    await resolveAt('casa', true, ctx(T0 + 2))
    await resolveAt('botiga', false, ctx(T0 + 3))
    expect(useRequestStore.getState().reveal).toBeUndefined()
    await resolveAt('recreatius', true, ctx(T0 + 4))

    const reveal = useRequestStore.getState().reveal
    expect(reveal?.kind).toBe('gift')
    const giftId = reveal?.kind === 'gift' ? reveal.entry.id : ''
    expect((await db.world.get('world'))?.owned).toContain(giftId)
    expect((await db.world.get('world'))?.petalsSpent).toBe(0)
    expect(useRequestStore.getState().day?.board.gift).toBe(giftId)
    expect(useRequestStore.getState().day?.live).toEqual([])
    expect(useProgress.getState().rewards.missionsDone).toContain(todayKey())

    dismissReveal()
    await resolveAt('botiga', true, ctx(T0 + 5))
    expect(useRequestStore.getState().reveal).toBeUndefined()
  })

  it('a day finished when she owns every gift just cheers', async () => {
    const { catalogEntries, defaultWorld } = await import('../data')
    const everything = catalogEntries().map((e) => e.id).filter((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
    await openDay(DAY, () => [TASKS[0]], ctx())
    await db.world.put({ ...defaultWorld(undefined), owned: everything.sort() })
    await resolveAt('recreatius', true, ctx())
    expect(useRequestStore.getState().reveal).toEqual({ kind: 'cheer' })
  })

  it('before the day is open, solving does nothing', async () => {
    await resolveAt('botiga', true, ctx())
    expect(useRequestStore.getState().day).toBeUndefined()
  })

  it('switching player forgets the day', async () => {
    await openDay(DAY, () => TASKS, ctx())
    useProgress.setState({ activePlayerId: crypto.randomUUID() })
    expect(useRequestStore.getState()).toMatchObject({ status: 'idle', day: undefined })
  })
})

describe('time, sync and wake', () => {
  it('counts the time played in memory; sync and wake only write when something changed', async () => {
    await openDay(DAY, () => TASKS, ctx())
    tickPlayed(5000)
    expect(useRequestStore.getState().day?.playedMs).toBe(5000)
    const before = useRequestStore.getState().day
    await syncRequests(ctx(T0 + 1))
    expect(useRequestStore.getState().day).toBe(before)
    await syncRequests(ctx(T0 + 200_000))
    await wakeRequests('botiga', ctx(T0 + 200_001))
    expect(useRequestStore.getState().day?.live.some((r) => r.placeId === 'botiga' && r.expiresSoft > T0 + 200_001)).toBe(true)
  })

  it('ticking or syncing with no day open does nothing', async () => {
    tickPlayed(5000)
    await syncRequests(ctx())
    expect(useRequestStore.getState().day).toBeUndefined()
  })
})
