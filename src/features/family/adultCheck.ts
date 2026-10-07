import { z } from 'zod'
import { createRng } from '../../core/rng'

export interface AdultCheck {
  a: number
  b: number
  answer: number
  /** As shown on screen, e.g. "14 × 7". */
  prompt: string
}

/**
 * A two-digit × one-digit product (12–19 × 6–9): easy for an adult, but well beyond the
 * times tables a 9-year-old is practising in the app, so she will not open it by chance.
 */
export function createAdultCheck(seed: string): AdultCheck {
  const rng = createRng(`adult-gate:${seed}`)
  const a = rng.int(12, 19)
  const b = rng.int(6, 9)
  return { a, b, answer: a * b, prompt: `${a} × ${b}` }
}

const answerSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}$/)
  .transform(Number)

export function isAdultAnswer(check: AdultCheck, input: string): boolean {
  const parsed = answerSchema.safeParse(input)
  return parsed.success && parsed.data === check.answer
}
