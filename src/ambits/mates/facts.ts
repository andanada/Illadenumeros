import { addKey, divKey, mulKey, subKey, tenKey } from './generators/itemFactory'

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const unique = (keys: string[]): string[] => [...new Set(keys)]
const sumOf = (key: string): number => key.replace(/^add:/, '').split('+').reduce((total, n) => total + Number(n), 0)

// Facts with a zero ("3 + 0") teach nothing and make a poor first question, so both addends start at 1.
const ADD_WITHIN_10 = unique(range(1, 9).flatMap((a) => range(1, 10 - a).map((b) => addKey(a, b))))
const TENS_FRIENDS = range(1, 9).map(tenKey)
const SUB_WITHIN_10 = range(2, 10).flatMap((a) => range(1, a - 1).map((b) => subKey(a, b)))
// Doubles and near doubles that cross the ten; the ones within 10 already belong to A4.
const DOUBLES_NEAR = unique([...range(1, 10).map((n) => addKey(n, n)), ...range(1, 9).map((n) => addKey(n, n + 1))].filter((key) => sumOf(key) > 10))
// Bridging the ten with numbers that are not doubles or near doubles (those are A7).
const BRIDGE_10 = unique(range(2, 9).flatMap((a) => range(2, 9).filter((b) => a + b > 10 && Math.abs(a - b) >= 2).map((b) => addKey(a, b))))
const SUB_WITHIN_20 = range(11, 18).flatMap((a) => range(2, 9).filter((b) => a - b < 10 && a - b >= 2).map((b) => subKey(a, b)))

// Multiplication tables: each product key belongs to the first table group that contains it.
const TIMES = range(1, 10)
const tableKeys = (tables: number[]): string[] => unique(tables.flatMap((t) => TIMES.map((n) => mulKey(t, n))))
const without = (keys: string[], ...earlier: string[][]): string[] => keys.filter((k) => !earlier.some((e) => e.includes(k)))
const TABLES_2_5_10 = tableKeys([2, 5, 10])
const TABLES_3_4 = without(tableKeys([3, 4]), TABLES_2_5_10)
const TABLES_6_9 = without(tableKeys([6, 9]), TABLES_2_5_10, TABLES_3_4)
const TABLES_7_8 = without(tableKeys([7, 8]), TABLES_2_5_10, TABLES_3_4, TABLES_6_9)
// Division facts are the inverse of a table: dividend = divisor × quotient.
const divisionKeys = (divisors: number[]): string[] => divisors.flatMap((d) => TIMES.map((q) => divKey(d * q, d)))
const DIV_2_5_10 = divisionKeys([2, 5, 10])
const DIV_REST = divisionKeys([3, 4, 6, 7, 8, 9])

const FACTS: Record<string, string[]> = {
  A4: ADD_WITHIN_10,
  A5: TENS_FRIENDS,
  A6: SUB_WITHIN_10,
  A7: DOUBLES_NEAR,
  A8: BRIDGE_10,
  A9: SUB_WITHIN_20,
  C4: TABLES_2_5_10,
  C5: TABLES_3_4,
  C7: DIV_2_5_10,
  D2: TABLES_6_9,
  D3: TABLES_7_8,
  D4: DIV_REST,
}

export function factsForSkill(skillId: string): string[] {
  return FACTS[skillId] ?? []
}
