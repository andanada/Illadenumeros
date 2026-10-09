import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey, useProgress } from '../../core/progress/store'
import type { MatesDb } from '../../core/storage/db'
import { activateTestPlayer, resetStoreForTest } from '../../test/playerDb'
import { resetWorldStoreForTest } from '../data/worldStore'
import { BOARD_META_KEY, newBoardState } from './boardState'
import { dismissReveal, openBoard, resetBoardStoreForTest, solveAt, useBoardStore } from './boardStore'

const TASKS = [
  { place: 'recreatius', count: 1, kind: 'calentament', neighbour: 'en-kofi' },
  { place: 'botiga', count: 2, kind: 'repte', neighbour: 'senyora-pilar' },
] as const

let db: MatesDb
const DAY = todayKey()

beforeEach(() => {
  db = activateTestPlayer()
  resetWorldStoreForTest()
  resetBoardStoreForTest()
})
afterEach(() => resetBoardStoreForTest())

describe('openBoard', () => {
  it("builds today's board once and stores it; the plan is not rebuilt the same day", async () => {
    const plan = vi.fn(() => TASKS)
    const board = await openBoard(DAY, plan)
    expect(board?.tasks).toEqual(TASKS)
    expect((await db.meta.get(BOARD_META_KEY))?.value).toEqual(board)
    resetBoardStoreForTest()
    const again = await openBoard(DAY, () => [])
    expect(again?.tasks).toEqual(TASKS)
    expect(plan).toHaveBeenCalledOnce()
  })

  it('a new day starts a new board; a damaged stored board is replaced', async () => {
    await db.meta.put({ key: BOARD_META_KEY, value: { ...newBoardState('2020-01-01', TASKS), done: { botiga: 2 } } })
    expect((await openBoard(DAY, () => TASKS))?.done).toEqual({})
    await db.meta.put({ key: BOARD_META_KEY, value: { day: DAY, tasks: 'x' } })
    resetBoardStoreForTest()
    expect((await openBoard(DAY, () => TASKS))?.tasks).toEqual(TASKS)
  })

  it('nobody playing: nothing opens', async () => {
    resetStoreForTest()
    expect(await openBoard(DAY, () => TASKS)).toBeUndefined()
  })
})

describe('solveAt', () => {
  it('ticks the place, persists, and the last errand claims a free surprise gift and marks the day done', async () => {
    await openBoard(DAY, () => TASKS)
    await solveAt('botiga')
    expect(useBoardStore.getState().board?.done).toEqual({ botiga: 1 })
    expect((await db.meta.get(BOARD_META_KEY))?.value).toMatchObject({ done: { botiga: 1 } })
    await solveAt('casa')
    await solveAt('botiga')
    expect(useBoardStore.getState().reveal).toBeUndefined()
    await solveAt('recreatius')

    const reveal = useBoardStore.getState().reveal
    expect(reveal?.kind).toBe('gift')
    const giftId = reveal?.kind === 'gift' ? reveal.entry.id : ''
    expect((await db.world.get('world'))?.owned).toContain(giftId)
    expect((await db.world.get('world'))?.petalsSpent).toBe(0)
    expect(useBoardStore.getState().board?.gift).toBe(giftId)
    expect(useProgress.getState().rewards.missionsDone).toContain(todayKey())

    // Extra errands after the board is done give no second gift.
    dismissReveal()
    await solveAt('botiga')
    expect(useBoardStore.getState().reveal).toBeUndefined()
  })

  it('a board finished when she owns every gift just cheers', async () => {
    const { catalogEntries } = await import('../data')
    const everything = catalogEntries().map((e) => e.id).filter((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
    await openBoard(DAY, () => [TASKS[0]])
    const { defaultWorld } = await import('../data')
    await db.world.put({ ...defaultWorld(undefined), owned: everything.sort() })
    await solveAt('recreatius')
    expect(useBoardStore.getState().reveal).toEqual({ kind: 'cheer' })
  })

  it('before the board is open, solving does nothing', async () => {
    await solveAt('botiga')
    expect(useBoardStore.getState().board).toBeUndefined()
  })

  it('switching player forgets the board', async () => {
    await openBoard(DAY, () => TASKS)
    useProgress.setState({ activePlayerId: crypto.randomUUID() })
    expect(useBoardStore.getState()).toMatchObject({ status: 'idle', board: undefined })
  })
})
