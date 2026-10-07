import { useProgress } from '../progress/store'
import { serialised } from '../progress/writeQueue'
import { CHARACTER_IDS, emptyRewards, profileSchema, THEME_COLORS, type CharacterId, type ThemeColor } from '../storage/db'
import { setPlayerId } from '../storage/meta'
import { openPlayerDb, playerDbName } from '../storage/playerDbs'
import { savePlayer, type PlayerSummary } from '../storage/registry'
import type { Api, RemoteProfile } from './api'
import { normalizeRewards, profileToInput } from './docs'
import { profileInputSchema, type ProfileInput } from './schemas'
import { readSyncState, writeSyncState } from './syncState'

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback

/** The server profile as a PUT body (unknown character/colour fall back to the defaults). */
export function remoteInput(remote: RemoteProfile): ProfileInput | undefined {
  const parsed = profileInputSchema.safeParse({
    name: remote.name,
    character: pick<CharacterId>(CHARACTER_IDS, remote.character, 'nyx'),
    color: pick<ThemeColor>(THEME_COLORS, remote.color, 'lila'),
    createdAt: Math.max(0, Math.floor(remote.createdAt)),
  })
  return parsed.success ? parsed.data : undefined
}

async function localInput(player: PlayerSummary): Promise<ProfileInput> {
  const row = profileSchema.safeParse(await openPlayerDb(player.dbName).profile.get('me'))
  return profileToInput(row.success ? row.data : player)
}

/** PUT the profile when name/character/colour changed here since the server last agreed (idempotent). */
export async function ensureRemoteProfile(api: Api, player: PlayerSummary): Promise<void> {
  const db = openPlayerDb(player.dbName)
  const input = await localInput(player)
  const json = JSON.stringify(input)
  if ((await readSyncState(db)).syncedProfile === json) return
  await api.putProfile(player.id, input)
  await writeSyncState(db, { syncedProfile: json })
}

/** A rename made on another device: adopted here only if this device did not change the profile meanwhile. */
export async function adoptRemoteProfile(player: PlayerSummary, remote: RemoteProfile): Promise<boolean> {
  const input = remoteInput(remote)
  const db = openPlayerDb(player.dbName)
  const { syncedProfile } = await readSyncState(db)
  if (!input || syncedProfile === undefined || JSON.stringify(input) === syncedProfile) return false
  if (JSON.stringify(await localInput(player)) !== syncedProfile) return false
  const { name, character, color } = input
  await serialised(async () => {
    const row = profileSchema.safeParse(await db.profile.get('me'))
    await db.transaction('rw', db.profile, db.meta, async () => {
      if (row.success) await db.profile.put({ ...row.data, name, character, color })
      await writeSyncState(db, { syncedProfile: JSON.stringify({ ...input, createdAt: (await localInput(player)).createdAt }) })
    })
    const next = { ...player, name, character, color }
    await savePlayer(next)
    useProgress.setState((s) => ({
      players: s.players.map((p) => (p.id === player.id ? { ...p, name, character, color } : p)),
      profile: s.activePlayerId === player.id && s.profile ? { ...s.profile, name, character, color } : s.profile,
    }))
  })
  return true
}

/** Creates the local player of a server-only profile (same uuid, its own new database). */
export async function createLocalPlayer(remote: RemoteProfile): Promise<PlayerSummary | undefined> {
  const input = remoteInput(remote)
  if (!input) return undefined
  const summary: PlayerSummary = { id: remote.id, dbName: playerDbName(remote.id), ...input, lastPlayedAt: input.createdAt }
  const db = openPlayerDb(summary.dbName)
  await db.transaction('rw', db.profile, db.meta, async () => {
    await db.profile.put({ id: 'me', ...input, diagnosticDone: false })
    await setPlayerId(db, remote.id)
    // What a fresh local copy holds is "agreed" with the server: nothing here to push over the cloud data.
    await writeSyncState(db, {
      syncedProfile: JSON.stringify(input),
      syncedSettings: JSON.stringify({ diagnosticDone: false }),
      syncedRewards: JSON.stringify(normalizeRewards(emptyRewards())),
    })
  })
  return savePlayer(summary)
}
