import type { Rng } from '../../core/rng'
import type { Level, TableFact } from '../shared/tables/tableFact'

export interface Dragon {
  readonly id: string
  readonly value: number
  /** True when the number belongs to the table (it is a multiple). */
  readonly belongs: boolean
}

export interface Herd {
  /** Table the dragons are sorted by (the factor / the divisor). */
  readonly table: number
  /** Number the question is about: the product or the dividend (always one of the multiples). */
  readonly target: number
  readonly dragons: readonly Dragon[]
}

/** Table and target of a fact: a x b -> table of b, target a x b; a : b -> table of b, target a. */
export function tableAndTarget(fact: TableFact): { table: number; target: number } {
  return fact.kind === 'mul' ? { table: fact.b, target: fact.product } : { table: fact.divisor, target: fact.dividend }
}

const MULTIPLE_COUNT: Record<Level, number> = { 1: 3, 2: 3, 3: 4 }
const DECOY_COUNT: Record<Level, number> = { 1: 3, 2: 3, 3: 3 }

const dragon = (value: number, table: number): Dragon => ({ id: `d${value}`, value, belongs: value % table === 0 })

function pickDecoys(table: number, level: Level, taken: ReadonlySet<number>, rng: Rng): number[] {
  const limit = table * 10
  // Level 3 decoys are the sneaky ones next to a multiple (12 -> 11, 13); earlier levels use clearly other numbers.
  const near = rng.shuffle(Array.from({ length: 10 }, (_, i) => table * (i + 1)).flatMap((m) => [m - 1, m + 1]))
  const any = rng.shuffle(Array.from({ length: limit }, (_, i) => i + 1))
  const pool = (level === 3 ? [...near, ...any] : any).filter((v) => v > 0 && v % table !== 0 && !taken.has(v))
  const out: number[] = []
  for (const v of pool) {
    if (!out.includes(v)) out.push(v)
    if (out.length === DECOY_COUNT[level]) break
  }
  return out
}

/** The herd of dragons for a round: some multiples of the table (the target among them) and a few that do not belong. */
export function buildHerd(fact: TableFact, level: Level, rng: Rng): Herd {
  const { table, target } = tableAndTarget(fact)
  const others = rng.shuffle(Array.from({ length: 10 }, (_, i) => table * (i + 1)).filter((m) => m !== target))
  const multiples = [target, ...others.slice(0, MULTIPLE_COUNT[level] - 1)]
  const decoys = pickDecoys(table, level, new Set(multiples), rng)
  const dragons = rng.shuffle([...multiples, ...decoys]).map((v) => dragon(v, table))
  return { table, target, dragons }
}

export const multiplesIn = (herd: Herd): Dragon[] => herd.dragons.filter((d) => d.belongs)

/** Whether every dragon of the table has been tapped. */
export const herdCollected = (herd: Herd, collected: readonly number[]): boolean => multiplesIn(herd).every((d) => collected.includes(d.value))

/** Answer stickers for a multiplication: the multiples the child collected (the product is one of them). */
export const productChoices = (herd: Herd, collected: readonly number[]): number[] =>
  multiplesIn(herd)
    .map((d) => d.value)
    .filter((v) => collected.includes(v))
    .sort((a, b) => a - b)

/** Gentle message for a dragon that does not belong (never an error). */
export function sleepyMessage(value: number, table: number): string {
  const below = Math.floor(value / table) * table
  return below > 0 ? `El ${value} dorm: no és de la taula del ${table}. Mira el ${below} i el ${below + table}.` : `El ${value} dorm: no és de la taula del ${table}.`
}

export const collectedMessage = (value: number, table: number): string => `${value} és de la taula del ${table}!`

/** Keyframes (left in %) so a dragon glides right to left at constant speed and then comes back from the right. */
export function glideFrames(start: number): { left: string[]; times: number[] } {
  const first = start + 20
  const total = first + 100 - start
  const jump = first / total
  return { left: [`${start}%`, '-20%', '100%', `${start}%`], times: [0, jump, Math.min(1, jump + 0.0001), 1] }
}
