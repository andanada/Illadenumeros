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
  'repte-illa',
  'fleca-files',
  'llaminadures',
  'botiga-pluja',
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
}

export interface GenerateContext {
  rng: Rng
  cpaStage: CpaStage
  /** Preferred fact to ask (spaced repetition), if the skill has facts. */
  factKey?: string
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
}
