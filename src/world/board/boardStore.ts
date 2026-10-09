import { create } from 'zustand'
import { useProgress } from '../../core/progress/store'
import { serialisedFor } from '../../core/progress/writeQueue'
import { getActiveDbName, getDb } from '../../core/storage/playerDbs'
import { onWorldStored, WORLD_ROW_ID, worldRowSchema } from '../../core/storage/worldRow'
import { catalogEntries, grantItem, useWorldStore } from '../data'
import type { CatalogEntry, SceneId } from '../model/types'
import { daySeed, type BoardTask } from './boardPlan'
import { BOARD_META_KEY, boardStateSchema, isBoardDone, newBoardState, pickGift, recordSolved, type BoardState } from './boardState'

/** What the town shows when the last errand of the day is done. */
export type BoardReveal = { kind: 'gift'; entry: CatalogEntry } | { kind: 'cheer' }

export interface BoardStoreState {
  status: 'idle' | 'ready'
  board: BoardState | undefined
  reveal: BoardReveal | undefined
}

const initial = (): BoardStoreState => ({ status: 'idle', board: undefined, reveal: undefined })

export const useBoardStore = create<BoardStoreState>(initial)

/** Same queue as the answers and the town row, for the player active at the call. */
const forActive = <T,>(task: () => Promise<T>, onStale: () => T): Promise<T> => {
  const id = useProgress.getState().activePlayerId
  return serialisedFor(id, () => useProgress.getState().activePlayerId, task, onStale)
}

async function readStored(): Promise<BoardState | undefined> {
  const parsed = boardStateSchema.safeParse((await getDb().meta.get(BOARD_META_KEY))?.value)
  return parsed.success ? parsed.data : undefined
}

async function writeStored(board: BoardState): Promise<void> {
  try {
    await getDb().meta.put({ key: BOARD_META_KEY, value: boardStateSchema.parse(board) })
  } catch {
    // The child keeps playing from memory; the adult sees the storage warning.
    useProgress.setState({ storageError: true })
  }
}

/**
 * Opens `day`'s board for the active player: the stored one if it is today's, else a new one with the
 * tasks from `plan` (called once, so the board is frozen for the day). A gift already claimed is granted
 * again (idempotent), in case the app closed between claiming and granting.
 */
export async function openBoard(day: string, plan: () => readonly BoardTask[]): Promise<BoardState | undefined> {
  const board = await forActive<BoardState | undefined>(
    async () => {
      const stored = await readStored().catch(() => undefined)
      const today = stored?.day === day ? stored : newBoardState(day, plan())
      if (today !== stored) await writeStored(today)
      useBoardStore.setState({ status: 'ready', board: today })
      return today
    },
    () => undefined,
  )
  if (board?.gift) await grantItem(board.gift, `tauler:${board.day}`)
  return board
}

async function ownedNow(): Promise<readonly string[]> {
  const parsed = worldRowSchema.safeParse(await getDb().world.get(WORLD_ROW_ID).catch(() => undefined))
  return parsed.success ? parsed.data.owned : (useWorldStore.getState().row?.owned ?? [])
}

/**
 * An errand was solved at `place`. When it was the last one of the board: the surprise gift is claimed
 * (stored first), granted for free, the day is marked done in `rewards.missionsDone`, and the reveal shows.
 */
export async function solveAt(place: SceneId): Promise<void> {
  const finished = await forActive<{ day: string; gift: CatalogEntry | undefined } | undefined>(
    async () => {
      const current = useBoardStore.getState().board
      if (!current) return undefined
      const next = recordSolved(current, place)
      if (next === current) return undefined
      const done = isBoardDone(next) && next.gift === undefined
      const gift = done ? pickGift(catalogEntries(), await ownedNow(), daySeed(next.day)) : undefined
      const stored = gift ? { ...next, gift: gift.id } : next
      useBoardStore.setState({ board: stored })
      await writeStored(stored)
      return done ? { day: next.day, gift } : undefined
    },
    () => undefined,
  )
  if (!finished) return
  if (finished.gift) await grantItem(finished.gift.id, `tauler:${finished.day}`)
  await useProgress.getState().completeMission()
  useBoardStore.setState({ reveal: finished.gift ? { kind: 'gift', entry: finished.gift } : { kind: 'cheer' } })
}

export const dismissReveal = (): void => useBoardStore.setState({ reveal: undefined })

// Another player: forget this one's board (read again on first use).
useProgress.subscribe((state, previous) => {
  if (state.activePlayerId !== previous.activePlayerId) useBoardStore.setState(initial())
})

// A reset or a restore rewrote this player's database: read the board again.
onWorldStored((dbName) => {
  if (dbName === getActiveDbName() && useBoardStore.getState().status === 'ready') useBoardStore.setState({ status: 'idle' })
})

/** For tests. */
export function resetBoardStoreForTest(): void {
  useBoardStore.setState(initial())
}
