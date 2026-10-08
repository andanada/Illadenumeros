import fc from 'fast-check'
import { CPA_STAGES, GAME_IDS, MISCONCEPTIONS } from '../ambit/types'
import { SKILL_STATUSES } from '../engine/mastery'
import type { DocKind } from './schemas'
import { canonicalWorld, worldData } from './worldArbitraries.testutil'

/** fast-check generators shared by the sync tests (valid docs, optionally corrupted). */

const skillId = fc.constantFrom('A1', 'A4', 'B2', 'C10', 'D9', 'a1', 'A100', '')
const factKey = fc.constantFrom('add:3+5', 'sub:12-7', 'mul:3x7', 'div:21:3', 'c10:3', 'add:3*5', 'xx')
const day = fc.constantFrom('2026-01-01', '2026-01-02', '2026-03-15', '2027-12-31', '26-1-1')
const sticker = fc.constantFrom('sol', 'lluna', 'gat-1', 'drac', 'Bad Id', 'x'.repeat(40))
const count = fc.oneof(fc.nat(50), fc.constant(-1), fc.constant(1.5))
const unit = fc.oneof(fc.double({ min: 0, max: 1, noNaN: true }), fc.constant(1.5))
const short = fc.string({ maxLength: 8 })

const skillData = fc.record({
  skillId,
  accuracy: unit,
  fluency: unit,
  mastery: unit,
  status: fc.constantFrom(...SKILL_STATUSES),
  cpaStage: fc.constantFrom(...CPA_STAGES),
  attempts: count,
  correct: count,
  sessions: fc.array(short, { maxLength: 22 }),
  recent: fc.array(fc.boolean(), { maxLength: 22 }),
  consecutiveErrors: count,
})

const factData = fc.record({
  factKey,
  box: fc.integer({ min: -1, max: 6 }),
  streak: count,
  attempts: count,
  correct: count,
  recentRts: fc.array(fc.nat(5000), { maxLength: 22 }),
  lastSeen: fc.integer({ min: -1, max: 2_000_000 }),
  dueAt: fc.nat(2_000_000),
})

const rewardsData = fc.record({
  id: fc.constantFrom('me', 'me', 'me', 'other'),
  petals: count,
  stickers: fc.uniqueArray(sticker, { maxLength: 4 }),
  daysPlayed: fc.uniqueArray(day, { maxLength: 4 }),
  missionsDone: fc.uniqueArray(day, { maxLength: 4 }),
})

const settingsValue = fc.oneof(
  fc.string({ maxLength: 10 }),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.array(fc.oneof(fc.string({ maxLength: 5 }), fc.integer(), fc.boolean()), { maxLength: 3 }),
  fc.constant({ nested: true }),
)
const settingsData = fc.dictionary(fc.constantFrom('diagnosticDone', 'theme', 'x', ''), settingsValue, { maxKeys: 3 })

const DATA: Record<DocKind, fc.Arbitrary<Record<string, unknown>>> = {
  skill: skillData,
  fact: factData,
  rewards: rewardsData,
  settings: settingsData,
  world: worldData,
}

/** Removes a field or changes it to a wrong type, to check that both validators reject the same things. */
const corrupt = (data: Record<string, unknown>): fc.Arbitrary<Record<string, unknown>> =>
  fc.oneof(
    { weight: 3, arbitrary: fc.constant(data) },
    {
      weight: 1,
      arbitrary: fc.constantFrom(...Object.keys(data).concat('extra')).chain((field) =>
        fc.constantFrom<Record<string, unknown>>(
          Object.fromEntries(Object.entries(data).filter(([k]) => k !== field)),
          { ...data, [field]: 'wrong' },
          { ...data, [field]: null },
        ),
      ),
    },
  )

export interface ArbDoc {
  kind: DocKind
  key: string
  data: Record<string, unknown>
  updatedAt: number
}

/**
 * A doc of `kind` (random if omitted). With `corrupted`, some docs are broken.
 * Without it, the data is valid enough for merging (numbers non-negative, right shape).
 */
export function arbDoc(corrupted: boolean, kind?: DocKind): fc.Arbitrary<ArbDoc> {
  const kinds = fc.constantFrom<DocKind>(...(kind ? [kind] : (['skill', 'fact', 'rewards', 'settings', 'world'] as const)))
  return kinds.chain((k) =>
    DATA[k]
      .map((d) => (corrupted ? d : sanitize(k, d)))
      .chain((d) => (corrupted ? corrupt(d) : fc.constant(d)))
      .chain((data) => fc.constantFrom(0, 1, 5, 1_000, 1_000_000).map((updatedAt) => ({ kind: k, key: keyOf(k, data), data, updatedAt }))),
  )
}

const keyOf = (kind: DocKind, data: Record<string, unknown>): string =>
  kind === 'skill' ? String(data.skillId) : kind === 'fact' ? String(data.factKey) : kind === 'rewards' ? 'me' : kind === 'world' ? 'world' : 'profile'

const nonNeg = (v: unknown): number => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0)

function sanitize(kind: DocKind, d: Record<string, unknown>): Record<string, unknown> {
  if (kind === 'skill' || kind === 'fact') return { ...d, attempts: nonNeg(d.attempts), correct: nonNeg(d.correct) }
  if (kind === 'rewards') return { ...d, id: 'me', petals: nonNeg(d.petals) }
  if (kind === 'world') return canonicalWorld(d)
  return d
}

export function arbAttemptData(corrupted: boolean): fc.Arbitrary<Record<string, unknown>> {
  const valid = fc.record(
    {
      ambitId: fc.constantFrom('mates', ''),
      skillId,
      factKey,
      correct: fc.boolean(),
      rtMs: fc.integer({ min: -1, max: 10_000 }),
      hintsUsed: fc.integer({ min: 0, max: 3 }),
      misconception: fc.constantFrom(...MISCONCEPTIONS, 'unknown'),
      cpaStage: fc.constantFrom(...CPA_STAGES),
      gameId: fc.constantFrom(...GAME_IDS, 'no-such-game'),
      sessionId: short,
      createdAt: fc.nat(2_000_000),
    },
    { requiredKeys: ['ambitId', 'skillId', 'correct', 'rtMs', 'hintsUsed', 'cpaStage', 'gameId', 'sessionId', 'createdAt'] },
  )
  return corrupted ? valid.chain(corrupt) : valid
}
