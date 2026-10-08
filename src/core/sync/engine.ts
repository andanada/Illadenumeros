import { useProgress } from '../progress/store'
import { notifyPlayersChanged } from '../storage/playersChannel'
import { openPlayerDb } from '../storage/playerDbs'
import { readPlayers, type PlayerSummary } from '../storage/registry'
import { ApiError, type Api, type SyncResponse } from './api'
import { applyPage } from './apply'
import { collectDocs, nextAttempts } from './collect'
import { attemptQuarantineId, docQuarantineId } from './docs'
import { readPendingDeletes, addPendingDelete, removePendingDelete } from './pendingDeletes'
import { pushBisect } from './push'
import { adoptRemoteProfile, createLocalPlayer, ensureRemoteProfile } from './remotePlayers'
import { MAX_DOCS_PER_PUSH, type OutgoingAttempt, type OutgoingDoc } from './schemas'
import { readSyncState, writeSyncState, type SyncState } from './syncState'

/*
 * Sync of one player = PUT profile (if changed) + push (docs changed since `lastPushedAt`, attempts
 * newer than `attemptsPushedAt`, <= 500 / <= 1000 per request) + pull (every response is a pull page,
 * repeated while `hasMore`). Each page is merged into the local database in one transaction that also
 * moves `syncSeq`; `lastPushedAt` / `attemptsPushedAt` only move after the server confirmed. Items the
 * server would reject are skipped before sending; a 422 for a whole push is bisected and the culprits
 * quarantined, so one bad row can never block sync forever.
 */

export interface PlayerSyncResult {
  /** Local rows that fail the server format (never sent) + invalid rows received. */
  readonly skipped: number
  /** Rows the server rejected on their own; not re-sent until they change. */
  readonly quarantined: number
  /** Deleted from the account on another device: kept here, no longer synced. */
  readonly detached?: boolean
}

const DETACHED: PlayerSyncResult = { skipped: 0, quarantined: 0, detached: true }

export type PlayerOutcome = PlayerSyncResult | { readonly error: ApiError }

export interface SyncAllResult {
  readonly players: Readonly<Record<string, PlayerOutcome>>
}

type Item = { readonly doc: OutgoingDoc } | { readonly attempt: OutgoingAttempt }

const quarantineIdOf = (item: Item): string => ('doc' in item ? docQuarantineId(item.doc) : attemptQuarantineId(item.attempt.id))

/** Errors that concern the whole account or connection: stop syncing the other players too. */
export const isGlobalError = (e: unknown): boolean => e instanceof ApiError && (e.status === 0 || e.status === 401 || e.status === 429 || e.status >= 500)

export interface EngineOptions {
  readonly api: Api
  readonly now?: () => number
}

export function createSyncEngine({ api, now = Date.now }: EngineOptions) {
  async function runOnce(player: PlayerSummary): Promise<PlayerSyncResult> {
    const db = openPlayerDb(player.dbName)
    if ((await readSyncState(db)).detached) return DETACHED
    try {
      await ensureRemoteProfile(api, player)
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
      await writeSyncState(db, { detached: true })
      return DETACHED
    }
    const start = now()
    let state: SyncState = await readSyncState(db)
    const changes = await collectDocs(db, state, start)
    let skipped = changes.skipped
    let quarantined = changes.quarantined
    let hasMore = false

    const send = async (batch: readonly Item[]): Promise<void> => {
      const docs = batch.flatMap((i) => ('doc' in i ? [i.doc] : []))
      const attempts = batch.flatMap((i) => ('attempt' in i ? [i.attempt] : []))
      const page: SyncResponse = await api.sync(player.id, { since: state.syncSeq, push: { docs, attempts } }).catch(async (error: unknown) => {
        if (error instanceof ApiError && error.status === 404) await writeSyncState(db, { detached: true })
        throw error
      })
      const extra: Partial<SyncState> = {
        ...(docs.some((d) => d.kind === 'rewards') && changes.rewardsJson ? { syncedRewards: changes.rewardsJson } : {}),
        ...(docs.some((d) => d.kind === 'settings') && changes.settingsJson ? { syncedSettings: changes.settingsJson } : {}),
        ...(docs.some((d) => d.kind === 'world') && changes.worldJson ? { syncedWorld: changes.worldJson } : {}),
      }
      skipped += await applyPage(db, player.id, page, extra)
      state = { ...state, syncSeq: page.seq }
      hasMore = page.hasMore
    }

    const pushRound = async (items: readonly Item[]): Promise<void> => {
      const rejected = await pushBisect(items, send)
      if (rejected.length === 0) return
      quarantined += rejected.length
      state = { ...(await readSyncState(db)), syncSeq: state.syncSeq }
      state = { ...state, quarantine: [...state.quarantine, ...rejected.map(quarantineIdOf)] }
      await writeSyncState(db, { quarantine: state.quarantine })
    }

    let docsLeft = changes.docs
    let cursor = state.attemptsPushedAt
    let first = true
    for (;;) {
      const batch = await nextAttempts(db, cursor, new Set(state.quarantine))
      const docs = docsLeft.slice(0, MAX_DOCS_PER_PUSH)
      docsLeft = docsLeft.slice(MAX_DOCS_PER_PUSH)
      skipped += batch.skipped
      quarantined += batch.quarantined
      const items: Item[] = [...docs.map((doc) => ({ doc })), ...batch.attempts.map((attempt) => ({ attempt }))]
      if (items.length > 0 || first) await pushRound(items)
      if (batch.cursor > cursor) await writeSyncState(db, { attemptsPushedAt: batch.cursor })
      cursor = batch.cursor
      first = false
      if (docsLeft.length === 0 && !batch.full) break
    }
    while (hasMore) await send([])
    await writeSyncState(db, { lastPushedAt: start })
    return { skipped, quarantined }
  }

  const running = new Map<string, { again: boolean; promise: Promise<PlayerSyncResult> }>()

  /** One sync at a time per player; a request while running is coalesced into ONE extra run. */
  function syncPlayer(playerId: string): Promise<PlayerSyncResult> {
    const current = running.get(playerId)
    if (current) {
      current.again = true
      return current.promise
    }
    const entry = { again: false, promise: Promise.resolve<PlayerSyncResult>({ skipped: 0, quarantined: 0 }) }
    entry.promise = (async () => {
      try {
        let result: PlayerSyncResult
        do {
          entry.again = false
          const player = (await readPlayers()).players.find((p) => p.id === playerId)
          if (!player || (await readPendingDeletes()).includes(playerId)) return { skipped: 0, quarantined: 0 }
          result = await runOnce(player)
        } while (entry.again)
        return result
      } finally {
        running.delete(playerId)
      }
    })()
    running.set(playerId, entry)
    return entry.promise
  }

  /** Deletes on the server the profiles deleted here (404 = already gone). Stops at the first other error. */
  async function flushPendingDeletes(): Promise<void> {
    for (const id of await readPendingDeletes()) {
      try {
        await api.deleteProfile(id, true)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error
      }
      await removePendingDelete(id)
    }
  }

  /** Player deleted on this device while logged in: purge it on the server (remembered if offline). */
  async function deleteRemotePlayer(playerId: string): Promise<void> {
    await addPendingDelete(playerId)
    await flushPendingDeletes().catch(() => undefined)
  }

  async function pullNewPlayers(): Promise<void> {
    const pending = new Set(await readPendingDeletes())
    const remote = await api.listProfiles()
    const local = (await readPlayers()).players
    const known = new Map(local.map((p) => [p.id, p] as const))
    let changed = false
    const remoteIds = new Set(remote.map((r) => r.id))
    // Synced with this family before but gone from it: deleted on another device. Never re-upload it.
    for (const p of local) {
      const db = openPlayerDb(p.dbName)
      const sync = await readSyncState(db)
      if (!remoteIds.has(p.id) && sync.syncedProfile !== undefined && !sync.detached) await writeSyncState(db, { detached: true })
    }
    for (const r of remote) {
      const mine = known.get(r.id)
      if (pending.has(r.id)) continue
      if (mine) changed = (await adoptRemoteProfile(mine, r)) || changed
      else changed = (await createLocalPlayer(r)) !== undefined || changed
    }
    if (changed) {
      await useProgress.getState().loadRegistry()
      notifyPlayersChanged()
    }
  }

  /** Every player of the device; account-wide errors (401, offline, 429, 5xx) abort and are thrown. */
  async function syncAll(): Promise<SyncAllResult> {
    await flushPendingDeletes()
    await pullNewPlayers()
    const players: Record<string, PlayerOutcome> = {}
    for (const player of (await readPlayers()).players) {
      try {
        players[player.id] = await syncPlayer(player.id)
      } catch (error) {
        if (isGlobalError(error) || !(error instanceof ApiError)) throw error
        players[player.id] = { error }
      }
    }
    return { players }
  }

  return { syncPlayer, syncAll, deleteRemotePlayer, flushPendingDeletes }
}

export type SyncEngine = ReturnType<typeof createSyncEngine>
