import { create } from 'zustand'
import { useProgress } from '../../core/progress/store'
import { serialisedFor } from '../../core/progress/writeQueue'
import { getActiveDbName, getDb } from '../../core/storage/playerDbs'
import { onWorldStored, WORLD_ROW_ID, worldRowSchema } from '../../core/storage/worldRow'
import { daySeed, type BoardTask } from '../board/boardPlan'
import { BOARD_META_KEY as LEGACY_BOARD_KEY, boardStateSchema, pickGift } from '../board/boardState'
import { catalogEntries, grantItem, useWorldStore } from '../data'
import type { CatalogEntry, SceneId } from '../model/types'
import { dayStateSchema, isQuotaDone, newDayState, recordResolved, REQUESTS_META_KEY, type DayState } from './dayState'
import { addPlayed, reconcile, wake, type GovernorContext } from './governor'

/** What the town shows when the day's maths is complete. */
export type DayReveal = { kind: 'gift'; entry: CatalogEntry } | { kind: 'cheer' }

export interface RequestStoreState {
  status: 'idle' | 'ready'
  day: DayState | undefined
  reveal: DayReveal | undefined
}

const initial = (): RequestStoreState => ({ status: 'idle', day: undefined, reveal: undefined })

export const useRequestStore = create<RequestStoreState>(initial)

/** Same queue as the answers and the town row, for the player active at the call. */
const forActive = <T,>(task: () => Promise<T>, onStale: () => T): Promise<T> => {
  const id = useProgress.getState().activePlayerId
  return serialisedFor(id, () => useProgress.getState().activePlayerId, task, onStale)
}

async function readStored(day: string): Promise<DayState | undefined> {
  const db = getDb()
  const parsed = dayStateSchema.safeParse((await db.meta.get(REQUESTS_META_KEY))?.value)
  if (parsed.success && parsed.data.day === day) return parsed.data
  const legacy = boardStateSchema.safeParse((await db.meta.get(LEGACY_BOARD_KEY))?.value)
  return legacy.success && legacy.data.day === day ? newDayState(day, legacy.data.tasks, legacy.data) : undefined
}

async function writeStored(state: DayState): Promise<void> {
  try {
    await getDb().meta.put({ key: REQUESTS_META_KEY, value: dayStateSchema.parse(state) })
  } catch {
    // The child keeps playing from memory; the adult sees the storage warning.
    useProgress.setState({ storageError: true })
  }
}

/**
 * Opens `day` for the active player: the stored state if it is today's (or today's old board, migrated),
 * else a new one with the allotment from `plan` (called once, so it is frozen for the day). A gift already
 * claimed is granted again (idempotent), in case the app closed between claiming and granting.
 */
export async function openDay(day: string, plan: () => readonly BoardTask[], ctx: GovernorContext): Promise<DayState | undefined> {
  const state = await forActive<DayState | undefined>(
    async () => {
      const stored = await readStored(day).catch(() => undefined)
      const today = reconcile(stored ?? newDayState(day, plan()), ctx)
      if (today !== stored) await writeStored(today)
      useRequestStore.setState({ status: 'ready', day: today })
      return today
    },
    () => undefined,
  )
  if (state?.board.gift) await grantItem(state.board.gift, `tauler:${state.day}`)
  return state
}

/** Applies a pure change to today's state and stores it when it changed. */
async function change(update: (state: DayState) => DayState): Promise<void> {
  await forActive<void>(
    async () => {
      const current = useRequestStore.getState().day
      if (!current) return
      const next = update(current)
      if (next === current) return
      useRequestStore.setState({ day: next })
      await writeStored(next)
    },
    () => undefined,
  )
}

export const syncRequests = (ctx: GovernorContext): Promise<void> => change((s) => reconcile(s, ctx))

/** She came into a place or tapped a calm character: its requests wake up. */
export const wakeRequests = (place: SceneId, ctx: GovernorContext): Promise<void> => change((s) => reconcile(wake(s, place, ctx), ctx))

/** Time in the town (memory only; stored with the next change). */
export function tickPlayed(ms: number): void {
  const current = useRequestStore.getState().day
  if (current) useRequestStore.setState({ day: addPlayed(current, ms) })
}

async function ownedNow(): Promise<readonly string[]> {
  const parsed = worldRowSchema.safeParse(await getDb().world.get(WORLD_ROW_ID).catch(() => undefined))
  return parsed.success ? parsed.data.owned : (useWorldStore.getState().row?.owned ?? [])
}

/**
 * A request was solved at `place` (`clean` = right at the first try, no help). When it completes the day's
 * maths: the surprise gift is claimed (stored first), granted for free, the day is marked done in
 * `rewards.missionsDone`, and the reveal shows.
 */
export async function resolveAt(place: SceneId, clean: boolean, ctx: GovernorContext): Promise<void> {
  const finished = await forActive<{ day: string; gift: CatalogEntry | undefined } | undefined>(
    async () => {
      const current = useRequestStore.getState().day
      if (!current) return undefined
      const solved = recordResolved(current, place, clean, ctx.now)
      const done = isQuotaDone(solved) && !isQuotaDone(current) && solved.board.gift === undefined
      const gift = done ? pickGift(catalogEntries(), await ownedNow(), daySeed(solved.day)) : undefined
      const next = reconcile(gift ? { ...solved, board: { ...solved.board, gift: gift.id } } : solved, ctx)
      useRequestStore.setState({ day: next })
      await writeStored(next)
      return done ? { day: next.day, gift } : undefined
    },
    () => undefined,
  )
  if (!finished) return
  if (finished.gift) await grantItem(finished.gift.id, `tauler:${finished.day}`)
  await useProgress.getState().completeMission()
  useRequestStore.setState({ reveal: finished.gift ? { kind: 'gift', entry: finished.gift } : { kind: 'cheer' } })
}

export const dismissReveal = (): void => useRequestStore.setState({ reveal: undefined })

// Another player: forget this one's day (read again on first use).
useProgress.subscribe((state, previous) => {
  if (state.activePlayerId !== previous.activePlayerId) useRequestStore.setState(initial())
})

// A reset or a restore rewrote this player's database: read the day again.
onWorldStored((dbName) => {
  if (dbName === getActiveDbName() && useRequestStore.getState().status === 'ready') useRequestStore.setState({ status: 'idle' })
})

/** For tests. */
export function resetRequestStoreForTest(): void {
  useRequestStore.setState(initial())
}
