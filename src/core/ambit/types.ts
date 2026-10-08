import { z } from 'zod'
import type { Rng } from '../rng'

export const CPA_STAGES = ['concret', 'pictoric', 'abstracte'] as const
export const cpaStageSchema = z.enum(CPA_STAGES)
export type CpaStage = z.infer<typeof cpaStageSchema>

export const GAME_IDS = [
  'marc-magic',
  'bombolles',
  'cursa-recta',
  'duel-llampec',
  'tren-sumes',
  'pesca-sumes',
  'repte-illa',
  'fleca-files',
  'llaminadures',
  'botiga-pluja',
  'numero-amagat',
  'pastis-fraccions',
  'laberint-aventura',
] as const
export const gameIdSchema = z.enum(GAME_IDS)
export type GameId = z.infer<typeof gameIdSchema>

export const MISCONCEPTIONS = [
  'off-by-one',
  'operation-swap',
  'no-carry',
  'reverse-digits',
  'place-value-concat',
  'adjacent-fact',
  'wrong-direction',
  /** a × b answered as a + b. */
  'mult-as-add',
  /** a : b answered as a − b. */
  'div-as-sub',
  /** Division with remainder: the remainder is forgotten or given as the quotient. */
  'remainder-forgotten',
  /** "¼ of 12" answered as 4 (the denominator) or 12 : 3 style slips. */
  'denominator-as-count',
  /** Euros and cents mixed up (2,50 € ↔ 2,05 € or 250 €). */
  'euro-cent-mix',
  /** A zero place holder lost or added (305 → 35, 350). */
  'place-value-zero',
  /** Two-step problem stopped after the first step. */
  'one-step-only',
  /** Tenths and hundredths mixed up (0,5 read as 0,05). */
  'decimal-place-value',
  /** The decimal with more digits taken as the bigger one (0,45 > 0,5). */
  'decimal-longer-bigger',
  /** Decimals added or subtracted as whole numbers, ignoring the comma. */
  'decimal-misaligned',
  /** Long multiplication: a partial product (tens row) is left out. */
  'partial-product-missing',
  /** The remainder written after the comma (7 : 2 = 3,1). */
  'remainder-as-decimal',
  /** Operations done left to right, ignoring priority or brackets. */
  'order-of-operations',
  /** n² or n³ answered as n × 2 or n × 3. */
  'power-as-multiple',
  /** Multiples and divisors confused. */
  'multiple-divisor-swap',
  /** Equivalent fraction built by adding the same number to both terms. */
  'fraction-additive',
  /** Only the numerator or only the denominator changed. */
  'fraction-one-part-only',
  /** 25 % of 80 answered 25. */
  'percent-as-amount',
  /** A percentage mapped to the wrong fraction (25 % as ½). */
  'percent-wrong-fraction',
] as const
export type MisconceptionId = (typeof MISCONCEPTIONS)[number]

/** Visual model shown as concrete/pictorial support or as a hint. */
export type VisualModel =
  | { kind: 'none' }
  | { kind: 'dots'; groups: number[] }
  | { kind: 'tenFrame'; a: number; b: number; op: '+' | '-' }
  | { kind: 'blocks'; hundreds: number; tens: number; ones: number }
  | { kind: 'numberLine'; from: number; to: number; start: number; target: number }
  | { kind: 'compare'; left: number; right: number }
  /** Multiplication as rows x columns of items ("La Fleca de les Files"). */
  | { kind: 'array'; rows: number; cols: number }
  /** Division as sharing `total` items between `groups` plates; `remainder` items are left over. */
  | { kind: 'share'; total: number; groups: number }
  /** A whole cut in `parts` equal parts with `selected` coloured; `collection` = items shown for "part of a collection". */
  | { kind: 'fraction'; parts: number; selected: number; collection?: number }
  /** Euro coins and notes, values in cents (e.g. 200 = 2 euros, 50 = 50 cents). */
  | { kind: 'money'; coins: number[] }
  /** Hundred square (10 x 10) with `filled` squares coloured: centèsimes and percentages. */
  | { kind: 'hundredGrid'; filled: number }
  /** Decimal number line from `from` to `to` (whole numbers) in tenths; `target` in hundredths. */
  | { kind: 'decimalLine'; from: number; to: number; target: number }

export interface Choice {
  value: string
  misconception?: MisconceptionId
}

export interface Item {
  id: string
  skillId: string
  factKey?: string
  /** Text shown on screen (Catalan). */
  text: string
  /** Text read aloud (Catalan). */
  speech: string
  answer: string
  /** Includes the right answer; already shuffled. */
  choices: Choice[]
  visual: VisualModel
  /** Visual support shown after a first error (always available, even in the abstract stage). */
  hintVisual: VisualModel
  /** Hint ladder: [visual cue, strategy, worked solution]. */
  hints: [string, string, string]
  cpaStage: CpaStage
  /** Numeric operands, used by interactive games (number line, ten frame). */
  operands?: { a: number; b: number; op: '+' | '-' | '×' | ':' }
}

export const gradeSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
export type Grade = z.infer<typeof gradeSchema>

/** Core arithmetic operations whose facts must be retained (strict mastery gate). */
export const OPERATION_IDS = ['add', 'sub', 'mul', 'div'] as const
export type OperationId = (typeof OPERATION_IDS)[number]

export interface SkillNode {
  id: string
  code: string
  grade: Grade
  title: string
  prereqs: string[]
  hasFacts: boolean
  games: GameId[]
  /** Time for an answer to count as fluent (before the 1.5x leniency). */
  fluencyTargetMs: number
  /** Set on the fact skills of add/sub/mul/div: they use the stricter retention-based mastery. */
  operation?: OperationId
}

export interface GenerateContext {
  rng: Rng
  cpaStage: CpaStage
  /** Preferred fact to ask (spaced repetition), if the skill has facts. */
  factKey?: string
  /** For commutative facts: which operand goes first ('desc' = the bigger one). Random when absent. */
  order?: 'asc' | 'desc'
}

export type ItemGenerator = (ctx: GenerateContext) => Item

export interface AmbitModule {
  id: string
  name: string
  skills: SkillNode[]
  generators: Record<string, ItemGenerator>
  /** Ordered anchor skills for the placement test. */
  diagnosticAnchors: string[]
  /** All fact keys a skill can produce (for the parent heatmap and selector). */
  factsForSkill: (skillId: string) => string[]
  /** Other facts of the same family (8+5 -> 13-5, 13-8), practised a few questions later. */
  factFamily?: (factKey: string) => string[]
  /** Skill that owns a fact key, if the fact is tracked. */
  factOwner?: (factKey: string) => string | undefined
}
