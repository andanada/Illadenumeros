import { create } from 'zustand'
import { matesAmbit } from '../../ambits/mates'
import { STICKERS } from '../../features/stickers/catalog'
import type { Placement } from '../engine/diagnostic'
import { factStateSchema, type FactState } from '../engine/leitner'
import { newSkillState, skillStateSchema, type SkillState } from '../engine/mastery'
import { db, emptyRewards, profileSchema, rewardsSchema, SCHEMA_VERSION, type Profile, type Rewards } from '../storage/db'
import { initialMeta } from '../storage/meta'
import { applyAnswer, type AnswerInput, type AnswerOutcome } from './applyAnswer'

/** Local calendar day (not UTC), so "today's mission" flips at local midnight. */
export const todayKey = (now = Date.now()): string => new Date(now).toLocaleDateString('sv-SE')
const newId = (): string => crypto.randomUUID()

export type NewProfile = Pick<Profile, 'name' | 'character' | 'color'>
export type RecordInput = Omit<AnswerInput, 'sessionId' | 'now' | 'skill'> & { skillId: string }

interface ProgressStore {
  loaded: boolean
  /** True when the browser could not read or write local storage; progress then lives in memory only. */
  storageError: boolean
  profile: Profile | undefined
  skillStates: Record<string, SkillState>
  factStates: Record<string, FactState>
  rewards: Rewards
  sessionId: string
  sessionResults: boolean[]
  load: () => Promise<void>
  saveProfile: (profile: NewProfile) => Promise<void>
  finishDiagnostic: (placement: Record<string, Placement>) => Promise<void>
  record: (input: RecordInput) => Promise<AnswerOutcome>
  grantSticker: () => Promise<string | undefined>
  completeMission: () => Promise<void>
  /** Erases all progress in one transaction. Resolves false (and changes nothing) if the disk write fails. */
  resetAll: () => Promise<boolean>
}

/**
 * All state-changing operations run one after another, so two quick taps (or a sticker granted
 * while an answer is being saved) can never read stale state and overwrite each other.
 */
let writeChain: Promise<unknown> = Promise.resolve()
function serialised<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task)
  writeChain = run.catch(() => undefined)
  return run
}

/** Valid rows only: a damaged row is skipped instead of discarding everything. */
function validRows<T>(rows: unknown[], parse: (row: unknown) => { success: boolean; data?: T }): T[] {
  return rows.flatMap((row) => {
    const parsed = parse(row)
    return parsed.success && parsed.data !== undefined ? [parsed.data] : []
  })
}

export const useProgress = create<ProgressStore>((set, get) => ({
  loaded: false,
  storageError: false,
  profile: undefined,
  skillStates: {},
  factStates: {},
  rewards: emptyRewards(),
  sessionId: newId(),
  sessionResults: [],

  load: async () => {
    try {
      const [profileRow, skills, facts, rewardsRow] = await Promise.all([
        db.profile.get('me'),
        db.skillStates.toArray(),
        db.factStates.toArray(),
        db.rewards.get('me'),
      ])
      const profile = profileSchema.safeParse(profileRow)
      const rewards = rewardsSchema.safeParse(rewardsRow)
      const skillRows = validRows<SkillState>(skills, (r) => skillStateSchema.safeParse(r))
      const factRows = validRows<FactState>(facts, (r) => factStateSchema.safeParse(r))
      set({
        loaded: true,
        storageError: false,
        profile: profile.success ? profile.data : undefined,
        skillStates: Object.fromEntries(skillRows.map((s) => [s.skillId, s])),
        factStates: Object.fromEntries(factRows.map((f) => [f.factKey, f])),
        rewards: rewards.success ? rewards.data : emptyRewards(),
      })
    } catch {
      // Never leave the child on the loading screen: carry on in memory and warn the adult.
      set({ loaded: true, storageError: true })
    }
  },

  saveProfile: (input) =>
    serialised(async () => {
      const current = get().profile
      const profile = profileSchema.parse({
        id: 'me',
        ...input,
        diagnosticDone: current?.diagnosticDone ?? false,
        createdAt: current?.createdAt ?? Date.now(),
      })
      set({ profile })
      try {
        await db.profile.put(profile)
      } catch {
        set({ storageError: true })
      }
    }),

  finishDiagnostic: (placement) =>
    serialised(async () => {
      const placed = Object.entries(placement).map(([skillId, p]) => ({
        ...(get().skillStates[skillId] ?? newSkillState(skillId)),
        mastery: p.mastery,
        accuracy: p.mastery,
        status: p.status,
        // Skills she already knows start at the pictorial stage; new learning starts concrete.
        cpaStage: p.status === 'consolidant' ? ('pictoric' as const) : ('concret' as const),
      }))
      const profile = get().profile
      const finished = profile ? { ...profile, diagnosticDone: true } : profile
      set((state) => ({
        skillStates: { ...state.skillStates, ...Object.fromEntries(placed.map((s) => [s.skillId, s])) },
        profile: finished,
      }))
      try {
        await db.transaction('rw', db.skillStates, db.profile, async () => {
          await db.skillStates.bulkPut(placed)
          if (finished) await db.profile.put(finished)
        })
      } catch {
        set({ storageError: true })
      }
    }),

  record: (input) =>
    serialised(async () => {
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
      try {
        await db.transaction('rw', db.skillStates, db.factStates, db.attempts, db.rewards, async () => {
          await db.skillStates.put(outcome.skillState)
          if (outcome.factState) await db.factStates.put(outcome.factState)
          await db.attempts.add(outcome.attempt)
          await db.rewards.put(rewards)
        })
      } catch {
        set({ storageError: true })
      }
      return outcome
    }),

  grantSticker: () =>
    serialised(async () => {
      const { rewards } = get()
      const missing = STICKERS.filter((s) => !rewards.stickers.includes(s.id))
      const sticker = missing[Math.floor(Math.random() * missing.length)]
      if (!sticker) return undefined
      const next = { ...rewards, stickers: [...rewards.stickers, sticker.id] }
      set({ rewards: next })
      try {
        await db.rewards.put(next)
      } catch {
        set({ storageError: true })
      }
      return sticker.id
    }),

  completeMission: () =>
    serialised(async () => {
      const { rewards } = get()
      const day = todayKey()
      if (rewards.missionsDone.includes(day)) return
      const next = { ...rewards, missionsDone: [...rewards.missionsDone, day] }
      set({ rewards: next })
      try {
        await db.rewards.put(next)
      } catch {
        set({ storageError: true })
      }
    }),

  resetAll: () =>
    serialised(async () => {
      const progressTables = [db.profile, db.skillStates, db.factStates, db.attempts, db.rewards, db.meta]
      try {
        await db.transaction('rw', progressTables, async () => {
          await Promise.all(progressTables.map((table) => table.clear()))
          // The schema version is structural, not progress: write it back with a fresh start date.
          await db.meta.bulkPut(initialMeta(SCHEMA_VERSION, Date.now()))
        })
      } catch {
        set({ storageError: true })
        return false
      }
      set({ profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards(), sessionResults: [], sessionId: newId() })
      return true
    }),
}))
