/** An addition or subtraction question reduced to what the five "arithmetic" games need. */
export type ProblemKind = 'sum' | 'diff' | 'missing'

export interface Problem {
  readonly kind: ProblemKind
  /** sum: a + b = answer; diff: a − b = answer; missing: a + answer = total. */
  readonly a: number
  /** Second operand (sum and diff); for `missing` it is the answer itself. */
  readonly b: number
  /** The value the child has to find. */
  readonly answer: number
  /** The biggest number of the sentence (sum result, minuend or total). */
  readonly top: number
}

const SUM = /^(\d+) \+ (\d+) = \?$/
const DIFF = /^(\d+) [−-] (\d+) = \?$/
const MISSING = /^(\d+) \+ \? = (\d+)$/
const MISSING_FIRST = /^\? \+ (\d+) = (\d+)$/

/** Reads the text of an item ("3 + 4 = ?", "9 − 5 = ?", "7 + ? = 10"). Undefined for any other item. */
export function parseProblem(text: string): Problem | undefined {
  const clean = text.replace(/\s+/g, ' ').trim()
  let m = SUM.exec(clean)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    return { kind: 'sum', a, b, answer: a + b, top: a + b }
  }
  m = DIFF.exec(clean)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    return a >= b ? { kind: 'diff', a, b, answer: a - b, top: a } : undefined
  }
  m = MISSING.exec(clean) ?? MISSING_FIRST.exec(clean)
  if (m) {
    const [known, total] = [Number(m[1]), Number(m[2])]
    return total >= known ? { kind: 'missing', a: known, b: total - known, answer: total - known, top: total } : undefined
  }
  return undefined
}

/** Difficulty tier from the size of the numbers: 1 up to 10, 2 up to 20, 3 beyond. */
export function levelOf(problem: Problem): 1 | 2 | 3 {
  return problem.top <= 10 ? 1 : problem.top <= 20 ? 2 : 3
}

/** Stable 32-bit hash of a text, to pick decorations deterministically without an Rng. */
export function hashText(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Splits `value` in two whole parts (both at least 1 when value ≥ 2), picked from a seed. */
export function splitValue(value: number, seed: number): readonly [number, number] {
  if (value < 2) return [value, 0]
  const first = 1 + (seed % (value - 1))
  return [first, value - first]
}
