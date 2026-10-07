import type { Choice, MisconceptionId } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'

export interface Candidate {
  value: number
  misconception: MisconceptionId
}

export interface ChoiceOptions {
  min: number
  max: number
  count?: number
}

const reverseDigits = (n: number): number => Number(String(n).split('').reverse().join(''))

/** Typical errors for a + b. */
export function additionCandidates(a: number, b: number): Candidate[] {
  const sum = a + b
  const onesCarry = (a % 10) + (b % 10) >= 10
  const list: Candidate[] = [
    { value: sum + 1, misconception: 'off-by-one' },
    { value: sum - 1, misconception: 'off-by-one' },
    { value: Math.abs(a - b), misconception: 'operation-swap' },
  ]
  if (onesCarry) list.push({ value: sum - 10, misconception: 'no-carry' })
  if (sum >= 10) list.push({ value: reverseDigits(sum), misconception: 'reverse-digits' })
  if (a % 10 === 0 && b < 10 && a > 0) list.push({ value: Number(`${a}${b}`), misconception: 'place-value-concat' })
  if (b % 10 === 0 && b > 0) list.push({ value: sum + 10, misconception: 'off-by-one' }, { value: sum - 10, misconception: 'off-by-one' })
  return list
}

/** Typical errors for a − b. */
export function subtractionCandidates(a: number, b: number): Candidate[] {
  const diff = a - b
  const list: Candidate[] = [
    { value: diff + 1, misconception: 'off-by-one' },
    { value: diff - 1, misconception: 'off-by-one' },
    { value: a + b, misconception: 'operation-swap' },
  ]
  const onesA = a % 10
  const onesB = b % 10
  if (onesB > onesA) {
    // "Smaller from larger" in the ones column: 42 − 7 → 45.
    list.push({ value: a - onesA - (b - onesB) + (onesB - onesA), misconception: 'no-carry' })
  }
  if (diff >= 10) list.push({ value: reverseDigits(diff), misconception: 'reverse-digits' })
  return list
}

const digits4 = (n: number): number[] => String(n).padStart(4, '0').split('').map(Number)

/** Column subtraction without borrowing: the smaller digit is taken from the larger one (342 − 157 → 215). */
export function columnNoBorrow(a: number, b: number): number {
  const db = digits4(b)
  return Number(digits4(a).map((d, i) => Math.abs(d - (db[i] ?? 0))).join(''))
}

/** Column addition dropping every carry (275 + 148 → 313). */
export function columnNoCarry(a: number, b: number): number {
  const db = digits4(b)
  return Number(digits4(a).map((d, i) => (d + (db[i] ?? 0)) % 10).join(''))
}

/** Typical errors for a × b: wrong neighbour in the table, × read as +, off by one. */
export function multiplicationCandidates(a: number, b: number): Candidate[] {
  const product = a * b
  const list: Candidate[] = [
    { value: a * (b + 1), misconception: 'adjacent-fact' },
    { value: a * (b - 1), misconception: 'adjacent-fact' },
    { value: (a + 1) * b, misconception: 'adjacent-fact' },
    { value: (a - 1) * b, misconception: 'adjacent-fact' },
    { value: a + b, misconception: 'mult-as-add' },
    { value: product + 1, misconception: 'off-by-one' },
  ]
  if (product >= 10 && reverseDigits(product) !== product) list.push({ value: reverseDigits(product), misconception: 'reverse-digits' })
  return list.filter((c) => c.value !== product && c.value > 0)
}

/** Typical errors for an exact a : b. */
export function divisionCandidates(a: number, b: number): Candidate[] {
  const quotient = a / b
  const list: Candidate[] = [
    { value: quotient + 1, misconception: 'adjacent-fact' },
    { value: quotient - 1, misconception: 'adjacent-fact' },
    { value: a - b, misconception: 'div-as-sub' },
    { value: b, misconception: 'operation-swap' },
  ]
  return list.filter((c) => c.value !== quotient && c.value > 0)
}

/** Builds distinct text choices (fractions, labels) from typical errors and fillers. */
export function buildTextChoices(answer: string, candidates: readonly { value: string; misconception?: MisconceptionId }[], rng: Rng, count = 4): Choice[] {
  const picked = new Map<string, Choice>()
  for (const candidate of candidates) {
    if (picked.size >= count - 1) break
    if (candidate.value !== answer && !picked.has(candidate.value)) picked.set(candidate.value, { ...candidate })
  }
  return rng.shuffle([{ value: answer }, ...picked.values()])
}

/**
 * Builds exactly `count` (default 4) distinct choices including the answer:
 * typical-error distractors first, topped up with nearby numbers.
 */
export function buildChoices(answer: number, candidates: readonly Candidate[], rng: Rng, options: ChoiceOptions): Choice[] {
  const count = options.count ?? 4
  const inRange = (v: number): boolean => Number.isInteger(v) && v >= options.min && v <= options.max && v !== answer
  const picked = new Map<number, Choice>()

  for (const candidate of rng.shuffle(candidates)) {
    if (picked.size >= count - 1) break
    if (inRange(candidate.value) && !picked.has(candidate.value)) {
      picked.set(candidate.value, { value: String(candidate.value), misconception: candidate.misconception })
    }
  }

  const offsets = [2, -2, 3, -3, 10, -10, 4, -4, 5, -5, 1, -1, 6, -6, 7, -7, 8, -8, 9, -9]
  for (const offset of offsets) {
    if (picked.size >= count - 1) break
    const value = answer + offset
    if (inRange(value) && !picked.has(value)) picked.set(value, { value: String(value) })
  }

  return rng.shuffle([{ value: String(answer) }, ...picked.values()])
}

/** Fixed symbol choices for comparisons. */
export function symbolChoices(rng: Rng): Choice[] {
  return rng.shuffle([{ value: '<' }, { value: '>' }, { value: '=' }])
}
