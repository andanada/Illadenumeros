import type { Choice, MisconceptionId } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'
import { formatDecimal } from './decimals'

export interface DecimalCandidate {
  /** Hundredths. */
  value: number
  misconception: MisconceptionId
}

export interface DecimalChoiceOptions {
  /** Hundredths bounds (inclusive). */
  min: number
  max: number
  /** Written with two decimals ("3,50"), for prices. */
  keepZero?: boolean
  /** Format override (e.g. euros). */
  format?: (hundredths: number) => string
  count?: number
}

const FILLERS = [10, -10, 100, -100, 1, -1, 20, -20, 5, -5, 50, -50, 200, -200, 30, -30]

/**
 * Four distinct choices (answer included) from values in hundredths: typical errors first, then nearby fillers.
 * Distinct hundredths always give distinct texts.
 */
export function buildDecimalChoices(answer: number, candidates: readonly DecimalCandidate[], rng: Rng, options: DecimalChoiceOptions): Choice[] {
  const count = options.count ?? 4
  const text = options.format ?? ((h: number) => formatDecimal(h, options.keepZero))
  const ok = (v: number): boolean => Number.isInteger(v) && v >= options.min && v <= options.max && v !== answer
  const picked = new Map<number, Choice>()
  for (const c of rng.shuffle(candidates)) {
    if (picked.size >= count - 1) break
    if (ok(c.value) && !picked.has(c.value)) picked.set(c.value, { value: text(c.value), misconception: c.misconception })
  }
  for (const offset of FILLERS) {
    if (picked.size >= count - 1) break
    const v = answer + offset
    if (ok(v) && !picked.has(v)) picked.set(v, { value: text(v) })
  }
  return rng.shuffle([{ value: text(answer) }, ...picked.values()])
}
