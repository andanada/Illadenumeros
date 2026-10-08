import type { Problem } from '../shared/arith/problem'

export interface Cell {
  /** True value of the block (the hidden block keeps its real value so the pyramid can be checked). */
  readonly value: number
  readonly hidden: boolean
}

/** Rows from the top block down to the base. */
export type Pyramid = readonly (readonly Cell[])[]

const cell = (value: number, hidden = false): Cell => ({ value, hidden })

/** Third base block of the bigger pyramids: small, so the top block stays easy to read. */
const sideBlock = (seed: number): number => (seed % 6) + 1

/** Number of rows: 2 for numbers up to 10, 3 beyond. */
export const rowsFor = (level: 1 | 2 | 3): 2 | 3 => (level === 1 ? 2 : 3)

/**
 * Builds the pyramid for a question. Every block is the sum of the two below it, and exactly one block is hidden:
 * the sum (addition up), the missing base of a subtraction, or the missing addend.
 */
export function buildPyramid(problem: Problem, level: 1 | 2 | 3, seed: number): Pyramid {
  const { kind, a, b } = problem
  const left = seed % 2 === 0
  if (rowsFor(level) === 2) {
    if (kind === 'sum') return [[cell(a + b, true)], [cell(a), cell(b)]]
    if (kind === 'diff') return left ? [[cell(a)], [cell(a - b, true), cell(b)]] : [[cell(a)], [cell(b), cell(a - b, true)]]
    return left ? [[cell(problem.top)], [cell(a), cell(b, true)]] : [[cell(problem.top)], [cell(b, true), cell(a)]]
  }
  const c = sideBlock(seed)
  if (kind === 'sum') return [[cell(a + 2 * b + c)], [cell(a + b, true), cell(b + c)], [cell(a), cell(b), cell(c)]]
  if (kind === 'diff') return [[cell(a + b + c)], [cell(a), cell(b + c)], [cell(a - b, true), cell(b), cell(c)]]
  return [[cell(problem.top + b + c)], [cell(problem.top), cell(b + c)], [cell(a), cell(b, true), cell(c)]]
}

/** True when every block equals the sum of the two under it. */
export function isConsistent(pyramid: Pyramid): boolean {
  for (let r = 0; r < pyramid.length - 1; r++) {
    const row = pyramid[r] ?? []
    const below = pyramid[r + 1] ?? []
    for (let i = 0; i < row.length; i++) {
      if ((row[i]?.value ?? NaN) !== (below[i]?.value ?? NaN) + (below[i + 1]?.value ?? NaN)) return false
    }
  }
  return true
}

/** Value of the single hidden block. */
export function hiddenValue(pyramid: Pyramid): number | undefined {
  return pyramid.flat().find((c) => c.hidden)?.value
}

/** Spoken description (accessible name) with the guess in the hidden block. */
export function describePyramid(pyramid: Pyramid, shown: number | null): string {
  const rows = pyramid.map((row, i) => {
    const names = row.map((c) => (c.hidden ? (shown === null ? 'buit' : String(shown)) : String(c.value))).join(', ')
    return `${i === pyramid.length - 1 ? 'base' : i === 0 ? 'punta' : 'pis del mig'}: ${names}`
  })
  return `Piràmide màgica. ${rows.join('. ')}. Cada bloc és la suma dels dos de sota.`
}
