import { z } from 'zod'

/*
 * Field lists copied from the client (src/core/storage/db.ts, engine/mastery.ts, engine/leitner.ts,
 * progress/applyAnswer.ts). Do NOT import client code: the server is deployed on its own.
 * Unknown keys are stripped (zod default), so the server never stores unvalidated content.
 */

export const CHARACTER_IDS = ['nyx', 'mixa', 'blau', 'nuvol', 'melo'] as const
export const THEME_COLORS = ['lila', 'rosa', 'blau', 'menta', 'taronja', 'negre'] as const
const CPA_STAGES = ['concret', 'pictoric', 'abstracte'] as const
const SKILL_STATUSES = ['bloquejada', 'nova', 'aprenent', 'consolidant', 'dominada'] as const
const GAME_IDS = [
  'marc-magic',
  'bombolles',
  'cursa-recta',
  'duel-llampec',
  'repte-illa',
  'fleca-files',
  'llaminadures',
  'botiga-pluja',
] as const
const MISCONCEPTIONS = [
  'off-by-one',
  'operation-swap',
  'no-carry',
  'reverse-digits',
  'place-value-concat',
  'adjacent-fact',
  'wrong-direction',
  'mult-as-add',
  'div-as-sub',
  'remainder-forgotten',
  'denominator-as-count',
  'euro-cent-mix',
  'place-value-zero',
  'one-step-only',
  'decimal-place-value',
  'decimal-longer-bigger',
  'decimal-misaligned',
  'partial-product-missing',
  'remainder-as-decimal',
  'order-of-operations',
  'power-as-multiple',
  'multiple-divisor-swap',
  'fraction-additive',
  'fraction-one-part-only',
  'percent-as-amount',
  'percent-wrong-fraction',
] as const

export const DOC_KINDS = ['skill', 'fact', 'rewards', 'settings'] as const
export type DocKind = (typeof DOC_KINDS)[number]

/** Max serialized size of one doc. Rewards grows with days played, so it gets a larger (still bounded) cap. */
export const MAX_DOC_BYTES = 8 * 1024
export const MAX_REWARDS_BYTES = 64 * 1024

const id = z.string().min(1).max(100)

/*
 * Client formats (H1/M1): bounded so that neither a single doc nor the merge of many can grow without limit.
 * - skill ids: 'A1'..'D9', 'A10', 'C10' (src/ambits/mates/skills.ts)
 * - fact keys: 'add:3+5', 'sub:12-7', 'mul:3x7', 'div:21:3', 'c10:3' (generators/itemFactory.ts)
 * - days: todayKey() = toLocaleDateString('sv-SE') = 'YYYY-MM-DD' (daysPlayed and missionsDone)
 * - stickers: the catalogue ids (src/features/stickers/catalog.ts), lower-case with dashes
 */
export const SKILL_ID_RE = /^[A-Z]\d{1,2}$/
export const FACT_KEY_RE = /^(add|sub|mul|div):\d+[+\-x:]\d+$|^c10:\d+$/
export const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/
export const STICKER_ID_RE = /^[a-z0-9-]{1,32}$/
export const MAX_STICKERS = 500
export const MAX_DAYS = 3660

const skillId = z.string().max(3).regex(SKILL_ID_RE)
const factKey = z.string().max(32).regex(FACT_KEY_RE)
const isoDay = z.string().regex(ISO_DAY_RE)
const stickerId = z.string().regex(STICKER_ID_RE)
const count = z.number().int().min(0).max(1_000_000_000)
const unit = z.number().min(0).max(1)
const shortStr = z.string().max(64)

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

/** Free-form small settings (e.g. {diagnosticDone}). Keys and values bounded; whole doc <= 8 KB. */
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

export type SkillData = z.infer<typeof skillDataSchema>
export type FactData = z.infer<typeof factDataSchema>
export type RewardsData = z.infer<typeof rewardsDataSchema>
export type SettingsData = z.infer<typeof settingsDataSchema>
export type AttemptData = z.infer<typeof attemptDataSchema>
export type DocData = SkillData | FactData | RewardsData | SettingsData

export const profileInputSchema = z.object({
  name: z.string().trim().min(1).max(20),
  character: z.enum(CHARACTER_IDS),
  color: z.enum(THEME_COLORS),
  createdAt: z.number().int().min(0),
})
export type ProfileInput = z.infer<typeof profileInputSchema>

const msEpoch = z.number().int().min(0).max(8_640_000_000_000_000)

export const docPushSchema = z.object({
  kind: z.enum(DOC_KINDS),
  key: z.string().min(1).max(100),
  data: z.unknown(),
  updatedAt: msEpoch,
})
export type DocPush = z.infer<typeof docPushSchema>

export const attemptPushSchema = z.object({
  id: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  data: z.unknown(),
  createdAt: msEpoch,
})

export const syncBodySchema = z.object({
  since: z.number().int().min(0),
  push: z
    .object({
      docs: z.array(docPushSchema).max(500).default([]),
      attempts: z.array(attemptPushSchema).max(1000).default([]),
    })
    .default({ docs: [], attempts: [] }),
})
export type SyncBody = z.infer<typeof syncBodySchema>

export interface ValidDoc {
  readonly kind: DocKind
  readonly key: string
  readonly data: DocData
  readonly updatedAt: number
}

function parseData(kind: DocKind, data: unknown): z.SafeParseReturnType<unknown, DocData> {
  switch (kind) {
    case 'skill':
      return skillDataSchema.safeParse(data)
    case 'fact':
      return factDataSchema.safeParse(data)
    case 'rewards':
      return rewardsDataSchema.safeParse(data)
    case 'settings':
      return settingsDataSchema.safeParse(data)
  }
}

function expectedKey(kind: DocKind, key: string, data: DocData): string {
  if (kind === 'skill') return (data as SkillData).skillId
  if (kind === 'fact') return (data as FactData).factKey
  if (kind === 'rewards') return 'me'
  return key
}

export const maxDocBytes = (kind: DocKind): number => (kind === 'rewards' ? MAX_REWARDS_BYTES : MAX_DOC_BYTES)

type DataCheck = { ok: true; data: DocData } | { ok: false; error: string }

/** Schema + serialized size check. Used for incoming docs AND again for the result of a merge. */
export function checkDocData(kind: DocKind, data: unknown): DataCheck {
  const parsed = parseData(kind, data)
  if (!parsed.success) return { ok: false, error: `${kind}.${parsed.error.issues[0]?.path.join('.') ?? ''}: invalid` }
  if (Buffer.byteLength(JSON.stringify(parsed.data)) > maxDocBytes(kind)) return { ok: false, error: `${kind}: too large` }
  return { ok: true, data: parsed.data }
}

/** Validates one doc against its kind schema; returns a path-only error (never echoes content). */
export function validateDoc(raw: DocPush): { ok: true; doc: ValidDoc } | { ok: false; error: string } {
  const { kind, key } = raw
  const checked = checkDocData(kind, raw.data)
  if (!checked.ok) return checked
  if (key !== expectedKey(kind, key, checked.data)) return { ok: false, error: `${kind}: key mismatch` }
  return { ok: true, doc: { kind, key, data: checked.data, updatedAt: raw.updatedAt } }
}

export function validateAttemptData(data: unknown): AttemptData | null {
  const parsed = attemptDataSchema.safeParse(data)
  if (!parsed.success) return null
  return Buffer.byteLength(JSON.stringify(parsed.data)) <= MAX_DOC_BYTES ? parsed.data : null
}
