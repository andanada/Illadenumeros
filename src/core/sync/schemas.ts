import { z } from 'zod'
import { CPA_STAGES, GAME_IDS, MISCONCEPTIONS } from '../ambit/types'
import { SKILL_STATUSES } from '../engine/mastery'
import { CHARACTER_IDS, THEME_COLORS } from '../storage/db'
import { MAX_WORLD_BYTES, worldDataSchema, type WorldData } from './worldSchemas'

/*
 * Client copy of the server's sync formats (server/src/lib/docSchemas.ts). Every outgoing doc and
 * attempt is checked with these BEFORE sending, so one bad row is skipped instead of making the
 * server reject (422) the whole push. The contract tests compare both copies.
 */

export const DOC_KINDS = ['skill', 'fact', 'rewards', 'settings', 'world'] as const
export type DocKind = (typeof DOC_KINDS)[number]

export const MAX_DOC_BYTES = 8 * 1024
export const MAX_REWARDS_BYTES = 64 * 1024
export const MAX_DOCS_PER_PUSH = 500
export const MAX_ATTEMPTS_PER_PUSH = 1000

export const SKILL_ID_RE = /^[A-Z]\d{1,2}$/
export const FACT_KEY_RE = /^(add|sub|mul|div):\d+[+\-x:]\d+$|^c10:\d+$/
export const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/
export const STICKER_ID_RE = /^[a-z0-9-]{1,32}$/
export const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]+$/
export const MAX_STICKERS = 500
export const MAX_DAYS = 3660

const id = z.string().min(1).max(100)
const skillId = z.string().max(3).regex(SKILL_ID_RE)
const factKey = z.string().max(32).regex(FACT_KEY_RE)
const isoDay = z.string().regex(ISO_DAY_RE)
const stickerId = z.string().regex(STICKER_ID_RE)
const count = z.number().int().min(0).max(1_000_000_000)
const unit = z.number().min(0).max(1)
const shortStr = z.string().max(64)
export const msEpoch = z.number().int().min(0).max(8_640_000_000_000_000)

export const skillDataSchema = z.object({
  skillId,
  accuracy: unit,
  fluency: unit,
  mastery: unit,
  status: z.enum(SKILL_STATUSES),
  cpaStage: z.enum(CPA_STAGES),
  attempts: count,
  correct: count,
  sessions: z.array(shortStr).max(20),
  recent: z.array(z.boolean()).max(20),
  consecutiveErrors: count,
})

export const factDataSchema = z.object({
  factKey,
  box: z.number().int().min(0).max(5),
  streak: count,
  attempts: count,
  correct: count,
  recentRts: z.array(z.number().min(0).max(1e9)).max(20),
  lastSeen: z.number().min(0),
  dueAt: z.number().min(0),
})

export const rewardsDataSchema = z.object({
  id: z.literal('me'),
  petals: count,
  stickers: z.array(stickerId).max(MAX_STICKERS),
  daysPlayed: z.array(isoDay).max(MAX_DAYS),
  missionsDone: z.array(isoDay).max(MAX_DAYS),
})

export const settingsDataSchema = z.record(
  z.string().min(1).max(64),
  z.union([
    z.string().max(256),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string().max(64), z.number(), z.boolean()])).max(50),
  ]),
)

export const attemptDataSchema = z.object({
  ambitId: id,
  skillId,
  factKey: factKey.optional(),
  correct: z.boolean(),
  rtMs: z.number().min(0).max(1e9),
  hintsUsed: z.number().int().min(0).max(1000),
  misconception: z.enum(MISCONCEPTIONS).optional(),
  cpaStage: z.enum(CPA_STAGES),
  gameId: z.enum(GAME_IDS),
  sessionId: shortStr,
  createdAt: z.number().min(0),
})

export const profileInputSchema = z.object({
  name: z.string().trim().min(1).max(20),
  character: z.enum(CHARACTER_IDS),
  color: z.enum(THEME_COLORS),
  createdAt: z.number().int().min(0),
})
export type ProfileInput = z.infer<typeof profileInputSchema>

export type SkillData = z.infer<typeof skillDataSchema>
export type FactData = z.infer<typeof factDataSchema>
export type RewardsData = z.infer<typeof rewardsDataSchema>
export type SettingsData = z.infer<typeof settingsDataSchema>
export type AttemptData = z.infer<typeof attemptDataSchema>
export type { WorldData }
export type DocData = SkillData | FactData | RewardsData | SettingsData | WorldData

const SCHEMAS: Record<DocKind, z.ZodType<DocData>> = {
  skill: skillDataSchema,
  fact: factDataSchema,
  rewards: rewardsDataSchema,
  settings: settingsDataSchema,
  world: worldDataSchema,
}

export const maxDocBytes = (kind: DocKind): number =>
  kind === 'rewards' ? MAX_REWARDS_BYTES : kind === 'world' ? MAX_WORLD_BYTES : MAX_DOC_BYTES

/** UTF-8 size of the JSON, the same measure as the server's Buffer.byteLength. */
export const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length

export type DataCheck = { ok: true; data: DocData } | { ok: false }

/** Schema + size check, exactly like the server (unknown keys are stripped). */
export function checkDocData(kind: DocKind, data: unknown): DataCheck {
  const parsed = SCHEMAS[kind].safeParse(data)
  if (!parsed.success || jsonBytes(parsed.data) > maxDocBytes(kind)) return { ok: false }
  return { ok: true, data: parsed.data }
}

const expectedKey = (kind: DocKind, key: string, data: DocData): string =>
  kind === 'skill' ? (data as SkillData).skillId : kind === 'fact' ? (data as FactData).factKey : kind === 'rewards' ? 'me' : kind === 'world' ? 'world' : key

export interface OutgoingDoc {
  readonly kind: DocKind
  readonly key: string
  readonly data: DocData
  readonly updatedAt: number
}

/** A doc the server will accept, or null (bad data, bad key or bad timestamp). */
export function checkOutgoingDoc(doc: { kind: DocKind; key: string; data: unknown; updatedAt: number }): OutgoingDoc | null {
  if (doc.key.length < 1 || doc.key.length > 100 || !msEpoch.safeParse(doc.updatedAt).success) return null
  const checked = checkDocData(doc.kind, doc.data)
  if (!checked.ok || expectedKey(doc.kind, doc.key, checked.data) !== doc.key) return null
  return { kind: doc.kind, key: doc.key, data: checked.data, updatedAt: doc.updatedAt }
}

export function checkAttemptData(data: unknown): AttemptData | null {
  const parsed = attemptDataSchema.safeParse(data)
  return parsed.success && jsonBytes(parsed.data) <= MAX_DOC_BYTES ? parsed.data : null
}

export interface OutgoingAttempt {
  readonly id: string
  readonly data: AttemptData
  readonly createdAt: number
}

export function checkOutgoingAttempt(a: { id: string; data: unknown; createdAt: number }): OutgoingAttempt | null {
  if (a.id.length < 8 || a.id.length > 64 || !ATTEMPT_ID_RE.test(a.id) || !msEpoch.safeParse(a.createdAt).success) return null
  const data = checkAttemptData(a.data)
  return data ? { id: a.id, data, createdAt: a.createdAt } : null
}
