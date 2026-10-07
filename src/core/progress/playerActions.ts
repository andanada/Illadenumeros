import { loadPlayers } from '../storage/bootstrap'
import { emptyRewards, profileSchema, type Profile } from '../storage/db'
import { setPlayerId } from '../storage/meta'
import { notifyPlayersChanged } from '../storage/playersChannel'
import { deletePlayerDb, getDb, openPlayerDb, playerDbName, setActivePlayerDb } from '../storage/playerDbs'
import { playerSummarySchema, readLastPlayerId, removePlayer, savePlayer, writeLastPlayerId, type PlayerSummary } from '../storage/registry'
import { emptyPlayerData, readPlayerData, summaryMatchesProfile, summaryWithProfile } from './playerData'
import type { GetState, ProgressStore, SetState } from './storeTypes'
import { serialised } from './writeQueue'

const newId = (): string => crypto.randomUUID()

const replacePlayer = (players: readonly PlayerSummary[], next: PlayerSummary): PlayerSummary[] =>
  players.map((p) => (p.id === next.id ? next : p))

/** Nobody playing: memory goes back to empty and no database is active. */
function deactivate(set: SetState): void {
  setActivePlayerDb(undefined)
  set({ activePlayerId: undefined, ...emptyPlayerData(), sessionId: newId(), sessionResults: [] })
}

type PlayerActions = Pick<
  ProgressStore,
  'init' | 'loadRegistry' | 'load' | 'selectPlayer' | 'createPlayer' | 'renamePlayer' | 'deletePlayer' | 'clearActivePlayer' | 'syncPlayers'
>

export function createPlayerActions(set: SetState, get: GetState): PlayerActions {
  /** Keeps the registry entry in step with the player's own profile (e.g. after restoring a backup). */
  const syncSummary = async (id: string, profile: Profile | undefined): Promise<void> => {
    const summary = get().players.find((p) => p.id === id)
    if (!summary || !profile || summaryMatchesProfile(summary, profile)) return
    const next = summaryWithProfile(summary, profile)
    set((s) => ({ players: replacePlayer(s.players, next) }))
    await savePlayer(next)
  }

  /** Reads the active player's database into memory, in one state update. */
  const load = async (): Promise<void> => {
    const activeId = get().activePlayerId
    if (activeId === undefined) {
      set({ loaded: true })
      return
    }
    try {
      const data = await readPlayerData(getDb())
      set({ loaded: true, storageError: false, ...data })
      await syncSummary(activeId, data.profile)
    } catch {
      // Never leave the child on the loading screen: carry on in memory and warn the adult.
      set({ loaded: true, storageError: true })
    }
  }

  const loadRegistry = async (): Promise<void> => {
    try {
      set({ players: await loadPlayers() })
    } catch {
      set({ storageError: true })
    }
  }

  const selectPlayer = (id: string): Promise<boolean> =>
    serialised(async () => {
      const player = get().players.find((p) => p.id === id)
      if (!player) return false
      const next = { ...player, lastPlayedAt: Date.now() }
      // Read first, then swap everything at once: the screens never see a half-switched player.
      const read = await readPlayerData(openPlayerDb(player.dbName)).then(
        (data) => ({ data, ok: true }),
        () => ({ data: emptyPlayerData(), ok: false }),
      )
      setActivePlayerDb(player.dbName)
      set((s) => ({
        loaded: true,
        storageError: s.storageError || !read.ok,
        activePlayerId: id,
        ...read.data,
        sessionId: newId(),
        sessionResults: [],
        players: replacePlayer(s.players, next),
      }))
      try {
        await syncSummary(id, read.data.profile)
        await savePlayer(get().players.find((p) => p.id === id) ?? next)
        await writeLastPlayerId(id)
      } catch {
        set({ storageError: true })
      }
      return true
    })

  const createPlayer: PlayerActions['createPlayer'] = (input) =>
    serialised(async () => {
      const id = newId()
      const now = Date.now()
      const profile = profileSchema.parse({ id: 'me', ...input, diagnosticDone: false, createdAt: now })
      const summary = playerSummarySchema.parse({ id, dbName: playerDbName(id), ...input, name: profile.name, createdAt: now, lastPlayedAt: now })
      setActivePlayerDb(summary.dbName)
      set((s) => ({
        loaded: true,
        players: [...s.players, summary],
        activePlayerId: id,
        profile,
        skillStates: {},
        factStates: {},
        rewards: emptyRewards(),
        sessionId: newId(),
        sessionResults: [],
      }))
      try {
        const database = getDb()
        await database.profile.put(profile)
        await setPlayerId(database, id)
        await savePlayer(summary)
        await writeLastPlayerId(id)
        notifyPlayersChanged()
      } catch {
        set({ storageError: true })
      }
      return id
    })

  const renamePlayer: PlayerActions['renamePlayer'] = (id, patch) =>
    serialised(async () => {
      const player = get().players.find((p) => p.id === id)
      if (!player) return false
      const parsed = playerSummarySchema.safeParse({ ...player, ...patch })
      if (!parsed.success) return false
      const next = parsed.data
      const { name, character, color } = next
      set((s) => ({
        players: replacePlayer(s.players, next),
        profile: s.activePlayerId === id && s.profile ? { ...s.profile, name, character, color } : s.profile,
      }))
      try {
        await savePlayer(next)
        const database = openPlayerDb(player.dbName)
        const row = profileSchema.safeParse(await database.profile.get('me'))
        if (row.success) await database.profile.put({ ...row.data, name, character, color })
        notifyPlayersChanged()
      } catch {
        set({ storageError: true })
      }
      return true
    })

  const deletePlayer: PlayerActions['deletePlayer'] = (id) =>
    serialised(async () => {
      const player = get().players.find((p) => p.id === id)
      if (!player) return false
      try {
        await deletePlayerDb(player.dbName)
        await removePlayer(id)
        if ((await readLastPlayerId()) === id) await writeLastPlayerId(undefined)
        notifyPlayersChanged()
      } catch {
        set({ storageError: true })
        return false
      }
      if (get().activePlayerId === id) deactivate(set)
      set((s) => ({ players: s.players.filter((p) => p.id !== id) }))
      return true
    })

  const clearActivePlayer = (): Promise<void> => serialised(async () => deactivate(set))

  const syncPlayers = (): Promise<void> =>
    serialised(async () => {
      await loadRegistry()
      const { activePlayerId, players } = get()
      if (activePlayerId === undefined) return
      if (players.some((p) => p.id === activePlayerId)) await load()
      else deactivate(set)
    })

  const init = async (): Promise<void> => {
    await loadRegistry()
    const { players } = get()
    const [only] = players
    if (players.length === 1 && only) await selectPlayer(only.id)
    set({ loaded: true })
  }

  return { init, loadRegistry, load, selectPlayer, createPlayer, renamePlayer, deletePlayer, clearActivePlayer, syncPlayers }
}
