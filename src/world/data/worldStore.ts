import { z } from 'zod'
import { create } from 'zustand'
import { useProgress } from '../../core/progress/store'
import { serialisedFor } from '../../core/progress/writeQueue'
import { getActiveDbName, getDb } from '../../core/storage/playerDbs'
import { coinsOf, onWorldStored, WORLD_ROW_ID, worldRowSchema, type WorldRow } from '../../core/storage/worldRow'
import { emitProgressChanged } from '../../core/sync/progressEvents'
import type { AvatarSpec, CatalogEntry, Placement, SceneId } from '../model/types'
import { defaultWorld } from './defaultWorld'
import * as logic from './worldLogic'

/*
 * The town's state for the ACTIVE player. Every read-modify-write runs on the SAME serialised queue
 * as the answers (core/progress/writeQueue), re-reading the row from disk inside the task, so a
 * purchase can never race an answer, a sync pull or a player switch.
 */

export interface CoinGrant {
  readonly amount: number
  readonly reason: string
  readonly at: number
}

export interface WorldStoreState {
  /** 'idle' = not read yet for this player (the town reads it on first use). */
  status: 'idle' | 'ready'
  row: WorldRow | undefined
  /** Last successful grantCoins (lets the HUD animate "+3 monedes"). */
  lastGrant: CoinGrant | undefined
}

const initial = (): WorldStoreState => ({ status: 'idle', row: undefined, lastGrant: undefined })

export const useWorldStore = create<WorldStoreState>(initial)

const NO_PLAYER = { ok: false, reason: 'no-player' } as const

/** Runs `task` for the player active now; dropped (onStale) if another player becomes active first. */
const forActive = <T,>(task: () => Promise<T>, onStale: () => T): Promise<T> => {
  const id = useProgress.getState().activePlayerId
  return serialisedFor(id, () => useProgress.getState().activePlayerId, task, onStale)
}

/** The stored row, or a fresh default (persisted once). Falls back to memory if the disk fails. */
async function readOrCreate(): Promise<WorldRow> {
  const db = getDb()
  try {
    const parsed = worldRowSchema.safeParse(await db.world.get(WORLD_ROW_ID))
    if (parsed.success) return parsed.data
    const fresh = defaultWorld(useProgress.getState().profile)
    await db.world.put(fresh)
    emitProgressChanged()
    return fresh
  } catch {
    useProgress.setState({ storageError: true })
    return useWorldStore.getState().row ?? defaultWorld(useProgress.getState().profile)
  }
}

/** Reads (creating it lazily) the active player's town row into memory. */
export function loadWorld(): Promise<WorldRow | undefined> {
  return forActive(
    async () => {
      const row = await readOrCreate()
      useWorldStore.setState({ status: 'ready', row })
      return row
    },
    () => undefined,
  )
}

type Op<R extends { ok: boolean }> = (row: WorldRow, petals: number, now: number) => R

/** Memory first (the child keeps playing), then disk; a failed write only warns the adult. */
function mutate<R extends { ok: true; row: WorldRow } | { ok: false; reason: logic.WorldFailure }>(op: Op<R>): Promise<R | typeof NO_PLAYER> {
  return forActive<R | typeof NO_PLAYER>(
    async () => {
      const current = await readOrCreate()
      const result = op(current, useProgress.getState().rewards.petals, Date.now())
      if (!result.ok) {
        useWorldStore.setState({ status: 'ready', row: current })
        return result
      }
      useWorldStore.setState({ status: 'ready', row: result.row })
      if (result.row === current) return result
      try {
        await getDb().world.put(result.row)
        emitProgressChanged()
      } catch {
        useProgress.setState({ storageError: true })
      }
      return result
    },
    () => NO_PLAYER,
  )
}

export const buyItem = (entry: CatalogEntry): Promise<logic.BuyResult> => mutate((row, petals) => logic.buy(row, entry, petals))

export const saveAvatar = (spec: AvatarSpec): Promise<logic.WorldResult> => mutate((row, _p, now) => logic.setAvatar(row, spec, now))

export const placeItem = (scene: SceneId, placement: Placement): Promise<logic.WorldResult> =>
  mutate((row, _p, now) => logic.place(row, scene, placement, now))

export const movePlaced = (scene: SceneId, uid: string, patch: logic.PlacementPatch): Promise<logic.WorldResult> =>
  mutate((row, _p, now) => logic.move(row, scene, uid, patch, now))

export const removePlaced = (scene: SceneId, uid: string): Promise<logic.WorldResult> => mutate((row, _p, now) => logic.remove(row, scene, uid, now))

export const adoptPet = (petId: string): Promise<logic.WorldResult> => mutate((row) => logic.adopt(row, petId))

const reasonSchema = z.string().trim().min(1).max(64)

/**
 * Gives `amount` coins (= petals) for a solved errand or a reward. Integer 1..1000 and a short
 * `reason` (e.g. 'botiga:suma'); serialised with the answers. Resolves true when granted.
 * NOTE: `useProgress.record()` already adds 3 (clean) / 1 (with help) petals per answer; use this
 * for extra errand rewards so the totals stay intentional.
 */
export async function grantCoins(amount: number, reason: string): Promise<boolean> {
  if (!reasonSchema.safeParse(reason).success) return false
  const granted = await useProgress.getState().grantPetals(amount)
  if (granted) useWorldStore.setState({ lastGrant: { amount, reason: reason.trim(), at: Date.now() } })
  return granted
}

/**
 * Gives a catalogue item for free (the daily board's surprise gift). `reason` is a short tag such as
 * 'tauler:2026-10-09' (1..64 chars). Coins spent do not change. Idempotent if already owned.
 */
export function grantItem(itemId: string, reason: string): Promise<logic.WorldResult | typeof NO_PLAYER> {
  if (useProgress.getState().activePlayerId === undefined) return Promise.resolve(NO_PLAYER)
  if (!reasonSchema.safeParse(reason).success) return Promise.resolve({ ok: false, reason: 'invalid' })
  return mutate((row) => logic.grant(row, itemId))
}

/** Coins she can spend now: max(0, petals earned - coins spent). */
export const currentCoins = (): number => coinsOf(useProgress.getState().rewards.petals, useWorldStore.getState().row?.petalsSpent ?? 0)

// Another player became active: forget this one's town (read again on first use).
useProgress.subscribe((state, previous) => {
  if (state.activePlayerId !== previous.activePlayerId) useWorldStore.setState(initial())
})

// The row was rewritten by a sync pull, a restore or a reset: reload it if it is the one in use.
onWorldStored((dbName) => {
  if (dbName === getActiveDbName() && useWorldStore.getState().status === 'ready') void loadWorld()
})

/** For tests: back to "nothing read". */
export function resetWorldStoreForTest(): void {
  useWorldStore.setState(initial())
}
