import { matesAmbit } from '../../src/ambits/mates'
import { CPA_STAGES } from '../../src/core/ambit/types'
import type { Grade, SkillNode } from '../../src/core/ambit/types'
import { clipKey, normalizeSpeech } from '../../src/core/audio/normalize'
import { createRng } from '../../src/core/rng'
import { BudgetError, estimateBytes, LIMITS, RESERVED_BYTES, totalsOf } from './budget'
import type { Limits, Totals } from './budget'
import { FIXED_PHRASES } from './phrases'

export { assertWithinBudget, BudgetError, LIMITS } from './budget'

/**
 * Which texts get a studio clip.
 *
 * The universe is every prompt the generators can produce (tens of thousands: numbers and word problems are
 * effectively unbounded), so coverage is chosen, not exhaustive:
 *  1. Fixed phrases are always in.
 *  2. Every other prompt is scored by its *hit probability*: how often it came out in a large deterministic sample
 *     of its skill (fact skills and small operand ranges saturate, so they are enumerated completely), times a weight
 *     per school year. Candidates are taken by hit probability per estimated byte until the budget is full.
 *  3. Word problems almost never repeat, so they are left to the device voice by this ranking, not by a rule.
 */
export const DEFAULT_SEEDS = 1500
export const VALIDATION_SEEDS = 400

/** The child is in 4th grade and the app grows towards 5th: those years get more of the budget than 1st grade. */
const GRADE_WEIGHT: Readonly<Record<Grade, number>> = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.3, 5: 1.3 }

export interface Candidate {
  /** Normalised text: what is sent to the voice and what the key is computed from. */
  readonly text: string
  readonly key: string
  /** Expected share of spoken prompts that equal this text (fixed phrases: Infinity). */
  readonly weight: number
  readonly sources: readonly string[]
}

export interface Selection extends Totals {
  readonly clips: number
  readonly selected: readonly Candidate[]
  readonly universe: Totals
  readonly seeds: number
}

const FIXED_SOURCE = 'fixed'

function sampleSkill(skill: SkillNode, seeds: number, namespace: string): { counts: Map<string, number>; samples: number } {
  const generator = matesAmbit.generators[skill.id]
  if (!generator) throw new Error(`Falta el generador de ${skill.id}`)
  const facts = matesAmbit.factsForSkill(skill.id)
  const counts = new Map<string, number>()
  let samples = 0
  for (let n = 0; n < seeds; n++) {
    for (const cpaStage of CPA_STAGES) {
      const factKey = facts.length > 0 ? facts[n % facts.length] : undefined
      const item = generator({ rng: createRng(`${namespace}:${skill.id}:${cpaStage}:${n}`), cpaStage, ...(factKey ? { factKey } : {}) })
      const text = normalizeSpeech(item.speech)
      counts.set(text, (counts.get(text) ?? 0) + 1)
      samples += 1
    }
  }
  return { counts, samples }
}

/** Every distinct normalised text found, with its summed hit probability. Deterministic for a given `seeds`. */
export function enumerateCandidates(seeds: number = DEFAULT_SEEDS): Candidate[] {
  const merged = new Map<string, { weight: number; sources: Set<string> }>()
  const add = (text: string, weight: number, source: string): void => {
    const entry = merged.get(text) ?? { weight: 0, sources: new Set<string>() }
    merged.set(text, { weight: entry.weight + weight, sources: entry.sources.add(source) })
  }
  for (const phrase of FIXED_PHRASES) add(normalizeSpeech(phrase), Infinity, FIXED_SOURCE)
  for (const skill of matesAmbit.skills) {
    const { counts, samples } = sampleSkill(skill, seeds, 'train')
    for (const [text, count] of counts) add(text, (count / samples) * GRADE_WEIGHT[skill.grade], skill.id)
  }
  return [...merged]
    .filter(([text]) => text.length > 0)
    .map(([text, { weight, sources }]) => ({ text, key: clipKey(text), weight, sources: [...sources].sort() }))
    .sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
}

/** Hash collisions would silently play the wrong clip: refuse to continue if two different texts share a key. */
export function assertUniqueKeys(candidates: readonly Candidate[]): void {
  const seen = new Map<string, string>()
  for (const { key, text } of candidates) {
    const other = seen.get(key)
    if (other !== undefined && other !== text) throw new Error(`Col·lisió de clau ${key}: «${other}» / «${text}»`)
    seen.set(key, text)
  }
}

/** Greedy by hit probability per byte, skipping what no longer fits. Fixed phrases come first and must fit. */
export function selectWithinBudget(candidates: readonly Candidate[], limits: Limits = LIMITS): Candidate[] {
  const maxBytes = limits.maxBytes - RESERVED_BYTES
  const ranked = byValue(candidates)
  const chosen: Candidate[] = []
  let chars = 0
  let bytes = 0
  for (const candidate of ranked) {
    const nextChars = chars + candidate.text.length
    const nextBytes = bytes + estimateBytes(candidate.text)
    if (nextChars > limits.maxChars || nextBytes > maxBytes) {
      if (candidate.weight === Infinity) throw new BudgetError(`Les frases fixes no caben al pressupost («${candidate.text}»)`)
      continue
    }
    chars = nextChars
    bytes = nextBytes
    chosen.push(candidate)
  }
  return chosen.sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
}

/** Most valuable first (hit probability per byte), so an interrupted run keeps the clips that matter most. */
export function byValue(candidates: readonly Candidate[]): Candidate[] {
  const ratio = (c: Candidate): number => (c.weight === Infinity ? Infinity : c.weight / estimateBytes(c.text))
  return [...candidates].sort((a, b) => {
    const diff = ratio(b) - ratio(a)
    if (diff !== 0 && !Number.isNaN(diff)) return diff
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0
  })
}

/** Full pipeline: enumerate, check keys, select within budget. */
export function collectTexts(options: { seeds?: number; limits?: Limits } = {}): Selection {
  const seeds = options.seeds ?? DEFAULT_SEEDS
  const candidates = enumerateCandidates(seeds)
  assertUniqueKeys(candidates)
  const selected = selectWithinBudget(candidates, options.limits ?? LIMITS)
  return { ...totalsOf(selected), clips: selected.length, selected, universe: totalsOf(candidates), seeds }
}

export interface SkillCoverage {
  readonly skillId: string
  readonly grade: Grade
  /** Share of fresh prompts (independent seeds) that have a clip. */
  readonly hitRate: number
}

/** Honest hit rate: prompts drawn with seeds the selection never saw. */
export function measureCoverage(selection: Selection, seeds: number = VALIDATION_SEEDS): { overall: number; perSkill: SkillCoverage[] } {
  const keys = new Set(selection.selected.map((c) => c.text))
  const perSkill = matesAmbit.skills.map((skill) => {
    const { counts, samples } = sampleSkill(skill, seeds, 'validation')
    let hits = 0
    for (const [text, count] of counts) if (keys.has(text)) hits += count
    return { skillId: skill.id, grade: skill.grade, hitRate: hits / samples }
  })
  const weights = perSkill.map((s) => GRADE_WEIGHT[s.grade])
  const weighted = perSkill.reduce((sum, s, i) => sum + s.hitRate * (weights[i] ?? 0), 0)
  return { overall: weighted / weights.reduce((a, b) => a + b, 0), perSkill }
}
