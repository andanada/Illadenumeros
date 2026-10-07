import { create } from 'zustand'
import { matesAmbit } from '../../ambits/mates'
import { STICKERS } from '../../features/stickers/catalog'
import { newSkillState } from '../engine/mastery'
import { emptyRewards, profileSchema, SCHEMA_VERSION, type Rewards } from '../storage/db'
import { initialMeta, META_KEYS, readMeta } from '../storage/meta'
import { getDb, NoActivePlayerError } from '../storage/playerDbs'
import { emitProgressChanged } from '../sync/progressEvents'
import { readSyncState, resetSnapshots, writeSyncState } from '../sync/syncState'
import { applyAnswer } from './applyAnswer'
import { createPlayerActions } from './playerActions'
import { emptyPlayerData } from './playerData'
import type { GetState, ProgressStore, SetState } from './storeTypes'
import { PlayerSwitchedError, serialisedFor } from './writeQueue'

export type { NewProfile, PlayerPatch, PlayerSummary, RecordInput } from './storeTypes'

/** Local calendar day (not UTC), so "today's mission" flips at local midnight. */
export const todayKey = (now = Date.now()): string => new Date(now).toLocaleDateString('sv-SE')
const newId = (): string => crypto.randomUUID()

/**
 * Queues a write for the player active right now. If another player becomes active first, the
 * write is dropped (`onStale`), so it can never reach the other player's state or database.
 */
const forActivePlayer = <T,>(get: GetState, task: () => Promise<T>, onStale: () => T): Promise<T> =>
  serialisedFor(get().activePlayerId, () => get().activePlayerId, task, onStale)

/** Runs a disk write; on failure the progress stays in memory and the adult is warned. */
async function persist(set: SetState, write: () => Promise<unknown>, notify = true): Promise<boolean> {
  try {
    await write()
    // Lets the cloud sync (if the family is logged in) send it a few seconds later.
    if (notify) emitProgressChanged()
    return true
  } catch {
    set({ storageError: true })
    return false
  }
}

function progressActions(set: SetState, get: GetState) {
  const saveProfile: ProgressStore['saveProfile'] = (input) =>
    forActivePlayer(
      get,
      async () => {
        const current = get().profile
        const profile = profileSchema.parse({ id: 'me', ...input, diagnosticDone: current?.diagnosticDone ?? false, createdAt: current?.createdAt ?? Date.now() })
        set({ profile })
        await persist(set, () => getDb().profile.put(profile))
      },
      () => undefined,
    )

  const finishDiagnostic: ProgressStore['finishDiagnostic'] = (placement) =>
    forActivePlayer(
      get,
      async () => {
        const placedAt = Date.now()
        const placed = Object.entries(placement).map(([skillId, p]) => ({
          ...(get().skillStates[skillId] ?? newSkillState(skillId)),
          mastery: p.mastery,
          accuracy: p.mastery,
          status: p.status,
          // Skills she already knows start at the pictorial stage; new learning starts concrete.
          cpaStage: p.status === 'consolidant' ? ('pictoric' as const) : ('concret' as const),
          updatedAt: placedAt,
        }))
        const profile = get().profile
        const finished = profile ? { ...profile, diagnosticDone: true } : profile
        set((state) => ({ skillStates: { ...state.skillStates, ...Object.fromEntries(placed.map((s) => [s.skillId, s])) }, profile: finished }))
        await persist(set, () => {
          const db = getDb()
          return db.transaction('rw', db.skillStates, db.profile, async () => {
            await db.skillStates.bulkPut(placed)
            if (finished) await db.profile.put(finished)
          })
        })
      },
      () => undefined,
    )

  const record: ProgressStore['record'] = (input) => {
    if (get().activePlayerId === undefined) return Promise.reject(new NoActivePlayerError())
    return forActivePlayer(
      get,
      async () => {
        const skill = matesAmbit.skills.find((s) => s.id === input.skillId)
        if (!skill) throw new Error(`Habilitat desconeguda: ${input.skillId}`)
        const state = get()
        const { skillId: _skillId, ...rest } = input
        const outcome = applyAnswer(
          { ...rest, skill, sessionId: state.sessionId, now: Date.now() },
          state.skillStates[skill.id],
          state.factStates,
          matesAmbit.factsForSkill(skill.id),
          newId(),
        )
        const day = todayKey()
        const rewards: Rewards = {
          ...state.rewards,
          petals: state.rewards.petals + outcome.petals,
          daysPlayed: state.rewards.daysPlayed.includes(day) ? state.rewards.daysPlayed : [...state.rewards.daysPlayed, day],
        }
        // Memory first: the child keeps playing even if the disk write fails.
        set((s) => ({
          skillStates: { ...s.skillStates, [outcome.skillState.skillId]: outcome.skillState },
          factStates: outcome.factState ? { ...s.factStates, [outcome.factState.factKey]: outcome.factState } : s.factStates,
          rewards,
          sessionResults: input.retry ? s.sessionResults : [...s.sessionResults, input.correct && input.hintsUsed === 0],
        }))
        await persist(set, () => {
          const db = getDb()
          return db.transaction('rw', db.skillStates, db.factStates, db.attempts, db.rewards, async () => {
            await db.skillStates.put(outcome.skillState)
            if (outcome.factState) await db.factStates.put(outcome.factState)
            await db.attempts.add(outcome.attempt)
            await db.rewards.put(rewards)
          })
        })
        return outcome
      },
      () => {
        throw new PlayerSwitchedError()
      },
    )
  }

  const grantSticker: ProgressStore['grantSticker'] = () =>
    forActivePlayer(
      get,
      async () => {
        const { rewards } = get()
        const missing = STICKERS.filter((s) => !rewards.stickers.includes(s.id))
        const sticker = missing[Math.floor(Math.random() * missing.length)]
        if (!sticker) return undefined
        const next = { ...rewards, stickers: [...rewards.stickers, sticker.id] }
        set({ rewards: next })
        await persist(set, () => getDb().rewards.put(next))
        return sticker.id
      },
      () => undefined,
    )

  const completeMission: ProgressStore['completeMission'] = () =>
    forActivePlayer(
      get,
      async () => {
        const { rewards } = get()
        const day = todayKey()
        if (rewards.missionsDone.includes(day)) return
        const next = { ...rewards, missionsDone: [...rewards.missionsDone, day] }
        set({ rewards: next })
        await persist(set, () => getDb().rewards.put(next))
      },
      () => undefined,
    )

  const resetAll: ProgressStore['resetAll'] = () =>
    forActivePlayer(
      get,
      async () => {
        const profile = get().profile
        const kept = profile ? { ...profile, diagnosticDone: false } : undefined
        const ok = await persist(set, async () => {
          const db = getDb()
          const { playerId } = await readMeta(db)
          const sync = await readSyncState(db)
          const tables = [db.profile, db.skillStates, db.factStates, db.attempts, db.rewards, db.meta]
          await db.transaction('rw', tables, async () => {
            await Promise.all(tables.map((table) => table.clear()))
            // Who the player is (name, character, colour, id) and the schema version are not progress.
            if (kept) await db.profile.put(kept)
            await db.meta.bulkPut(initialMeta(SCHEMA_VERSION, Date.now()))
            if (playerId) await db.meta.put({ key: META_KEYS.playerId, value: playerId })
            // Cloud sync cursors are not progress. The emptied rewards/settings count as "agreed", so this
            // reset stays on this device instead of being pushed over (and merged with) the cloud copy.
            await writeSyncState(db, { ...sync, ...resetSnapshots() })
          })
        }, false)
        if (!ok) return false
        set({ ...emptyPlayerData(), profile: kept, sessionResults: [], sessionId: newId() })
        return true
      },
      () => false,
    )

  return { saveProfile, finishDiagnostic, record, grantSticker, completeMission, resetAll }
}

export const useProgress = create<ProgressStore>((set, get) => ({
  loaded: false,
  storageError: false,
  players: [],
  activePlayerId: undefined,
  profile: undefined,
  skillStates: {},
  factStates: {},
  rewards: emptyRewards(),
  sessionId: newId(),
  sessionResults: [],
  ...createPlayerActions(set, get),
  ...progressActions(set, get),
}))
