import { create } from 'zustand'
import { ApiError, createApi, type Api, type AuthResponse } from './api'
import { setAccountHint, hasAccountHint } from './accountHint'
import { bindSyncFamily, forgetSyncData } from './accountMeta'
import { createSyncEngine, type SyncEngine } from './engine'
import { describeError } from './errors'
import { createScheduler, type Scheduler } from './scheduler'

/*
 * Family account state (adult area). The session is an HttpOnly cookie: nothing secret lives in JS.
 * The email is kept in memory only; passwords are passed straight to the API and never stored.
 * Sync is best-effort and silent: errors only change this state, never the game.
 */

export type AccountStatus = 'unknown' | 'loggedOut' | 'loggedIn' | 'offline'

export interface PlayerSyncState {
  /** detached = deleted from the account on another device; kept here, no longer synced. */
  readonly state: 'idle' | 'syncing' | 'error' | 'detached'
  readonly skipped: number
  readonly quarantined: number
  readonly message?: string
}

export type ActionResult = { ok: true } | { ok: false; message: string }

export interface AccountState {
  status: AccountStatus
  email: string | undefined
  lastSyncAt: number | undefined
  syncing: boolean
  /** Last account-wide problem, in Catalan, for the adult (undefined when fine). */
  message: string | undefined
  players: Readonly<Record<string, PlayerSyncState>>

  restore: () => Promise<void>
  register: (email: string, password: string, inviteCode: string) => Promise<ActionResult>
  login: (email: string, password: string) => Promise<ActionResult>
  logout: () => Promise<void>
  syncNow: () => Promise<boolean>
  changePassword: (current: string, next: string) => Promise<ActionResult>
  deleteAccount: (password: string) => Promise<ActionResult>
  /** A player was deleted on this device: purge it on the server too (best effort, remembered offline). */
  forgetPlayer: (playerId: string) => Promise<void>
}

interface Deps {
  api: Api
  engine: SyncEngine
  scheduler: Scheduler
  autoSync: boolean
}

let deps: Deps
let shared: Promise<void> | undefined

const initial = { status: 'unknown' as AccountStatus, email: undefined, lastSyncAt: undefined, syncing: false, message: undefined, players: {} }

const fail = (error: unknown): ActionResult => ({ ok: false, message: describeError(error) })

const setAccount = (patch: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)): void => useAccount.setState(patch)

function loggedOut(message?: string): void {
  deps.scheduler.stop()
  setAccountHint(false)
  setAccount({ status: 'loggedOut', email: undefined, players: {}, syncing: false, message })
}

async function loggedIn(auth: AuthResponse): Promise<void> {
  await bindSyncFamily(auth.family.id)
  setAccountHint(true)
  setAccount({ status: 'loggedIn', email: auth.family.email, message: undefined })
  if (deps.autoSync) deps.scheduler.start()
}

const withState = (players: Readonly<Record<string, PlayerSyncState>>, state: PlayerSyncState['state']) =>
  Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p, state }]))

/** One sync of every player. Rejects with account-wide errors (the scheduler backs off on them). */
async function runSync(): Promise<void> {
  setAccount((s) => ({ syncing: true, players: withState(s.players, 'syncing') }))
  try {
    const result = await deps.engine.syncAll()
    const players = Object.fromEntries(
      Object.entries(result.players).map(([id, outcome]): [string, PlayerSyncState] =>
        'error' in outcome
          ? [id, { state: 'error', skipped: 0, quarantined: 0, message: describeError(outcome.error) }]
          : [id, { state: outcome.detached ? 'detached' : 'idle', skipped: outcome.skipped, quarantined: outcome.quarantined }],
      ),
    )
    setAccount({ status: 'loggedIn', syncing: false, lastSyncAt: Date.now(), players, message: undefined })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) loggedOut(describeError(error))
    else {
      const offline = error instanceof ApiError && error.status === 0
      setAccount((s) => ({ syncing: false, message: describeError(error), ...(offline ? { status: 'offline' as const } : {}), players: withState(s.players, 'idle') }))
    }
    throw error
  }
}

/** Shared by the scheduler and "Sincronitza ara": never two full syncs at once. */
function syncShared(): Promise<void> {
  shared ??= runSync().finally(() => {
    shared = undefined
  })
  return shared
}

async function authAction(call: () => Promise<AuthResponse>): Promise<ActionResult> {
  try {
    await loggedIn(await call())
    return { ok: true }
  } catch (error) {
    // The server answered (wrong code, password...): we know there is no session.
    if (error instanceof ApiError && error.status !== 0 && useAccount.getState().status !== 'loggedIn') setAccount({ status: 'loggedOut' })
    return fail(error)
  }
}

async function reauthAction(call: () => Promise<void>): Promise<ActionResult> {
  try {
    await call()
    return { ok: true }
  } catch (error) {
    // 5 wrong passwords close every session (server L5): then we are logged out.
    if (error instanceof ApiError && error.status === 401) loggedOut(describeError(error))
    return fail(error)
  }
}

export const useAccount = create<AccountState>((_set, get) => ({
  ...initial,

  restore: async () => {
    try {
      await loggedIn(await deps.api.me())
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) setAccount({ status: 'offline', message: describeError(error) })
      else loggedOut()
    }
  },

  register: (email, password, inviteCode) => authAction(() => deps.api.register(email.trim(), password, inviteCode.trim())),
  login: (email, password) => authAction(() => deps.api.login(email.trim(), password)),

  logout: async () => {
    await deps.api.logout().catch(() => undefined)
    loggedOut()
  },

  syncNow: async () => {
    const { status } = get()
    if (status !== 'loggedIn' && status !== 'offline') return false
    return syncShared().then(
      () => true,
      () => false,
    )
  },

  changePassword: (current, next) => reauthAction(() => deps.api.changePassword(current, next)),

  deleteAccount: async (password) => {
    const result = await reauthAction(() => deps.api.deleteAccount(password))
    if (!result.ok) return result
    await forgetSyncData().catch(() => undefined)
    loggedOut()
    return result
  },

  forgetPlayer: async (playerId) => {
    const { status } = get()
    if (status !== 'loggedIn' && status !== 'offline') return
    await deps.engine.deleteRemotePlayer(playerId).catch(() => undefined)
  },
}))

export interface AccountOptions {
  readonly fetch?: typeof fetch
  /** Start the background scheduler after logging in (off in unit tests). */
  readonly autoSync?: boolean
}

/** (Re)builds the API client, engine and scheduler; resets the state. Called once at start and by tests. */
export function configureAccount(options: AccountOptions = {}): void {
  deps?.scheduler.stop()
  const api = createApi(options.fetch ? { fetch: options.fetch } : {})
  deps = { api, engine: createSyncEngine({ api }), scheduler: createScheduler({ run: syncShared }), autoSync: options.autoSync ?? true }
  shared = undefined
  useAccount.setState({ ...initial })
}

configureAccount()

/** App start: checks the cookie session once, only on devices that logged in before. */
export async function restoreSessionAtStart(): Promise<void> {
  if (hasAccountHint()) await useAccount.getState().restore()
  else useAccount.setState({ status: 'loggedOut' })
}
