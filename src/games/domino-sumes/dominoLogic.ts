import { splitValue, type Problem } from '../shared/arith/problem'

export type Half =
  | { readonly kind: 'num'; readonly n: number }
  | { readonly kind: 'expr'; readonly text: string; readonly value: number }
  | { readonly kind: 'pips'; readonly n: number }

export interface Domino {
  readonly id: string
  readonly left: Half
  readonly right: Half
}

/** The open end of the chain: what the child completes. */
export interface OpenEnd {
  /** value: the half is a bare number; addend: the half is "known + ?" and must reach the target. */
  readonly mode: 'value' | 'addend'
  readonly known: number
  /** Number on the touching half that the open half must equal. */
  readonly target: number
}

export interface Chain {
  readonly fixed: readonly Domino[]
  readonly open: OpenEnd
}

/** Numeric value of a half, if it has one (pips are decoration only). */
export function halfValue(half: Half): number | undefined {
  return half.kind === 'num' ? half.n : half.kind === 'expr' ? half.value : undefined
}

/** Two touching halves are accepted when both have a value and the values are equal. */
export function touches(a: Half, b: Half): boolean {
  const [x, y] = [halfValue(a), halfValue(b)]
  return x !== undefined && y !== undefined && x === y
}

/** The question as a domino half ("3 + 4" with value 7). */
export function questionHalf(problem: Problem): Half {
  if (problem.kind === 'sum') return { kind: 'expr', text: `${problem.a} + ${problem.b}`, value: problem.answer }
  if (problem.kind === 'diff') return { kind: 'expr', text: `${problem.a} − ${problem.b}`, value: problem.answer }
  return { kind: 'num', n: problem.top }
}

/** Dominoes already placed before the open end: 0 at level 1, 1 at level 2, 2 at level 3. They always chain correctly. */
export function buildChain(problem: Problem, level: 1 | 2 | 3, seed: number): Chain {
  const fixed: Domino[] = []
  let carry = (seed % 6) + 1
  for (let i = 0; i < level - 1; i++) {
    const w = 2 + ((seed >> (i * 3)) % 7)
    const [x, y] = splitValue(w, seed + i)
    fixed.push({ id: `p${i}`, left: i === 0 ? { kind: 'pips', n: carry } : { kind: 'num', n: carry }, right: { kind: 'expr', text: `${x} + ${y}`, value: w } })
    carry = w
  }
  const joint: Domino = {
    id: 'q',
    left: fixed.length > 0 ? { kind: 'num', n: carry } : { kind: 'pips', n: (seed % 5) + 1 },
    right: questionHalf(problem),
  }
  const open: OpenEnd =
    problem.kind === 'missing'
      ? { mode: 'addend', known: problem.a, target: problem.top }
      : { mode: 'value', known: 0, target: problem.answer }
  return { fixed: [...fixed, joint], open }
}

/** Value of the open half when `n` is placed in it. */
export const openValue = (open: OpenEnd, n: number): number => (open.mode === 'addend' ? open.known + n : n)

/** True when the number placed in the open half touches the chain correctly. */
export const fits = (open: OpenEnd, n: number): boolean => openValue(open, n) === open.target

/** Decorative pip count of the far half of a tray domino (1..6), stable per value. */
export const trayPips = (value: number): number => ((value * 5 + 2) % 6) + 1

/** Spoken description of the chain for the accessible name. */
export function describeChain(chain: Chain, shown: number | null): string {
  const parts = chain.fixed.map((d) => (d.right.kind === 'expr' ? d.right.text : d.right.kind === 'num' ? String(d.right.n) : 'punts'))
  const open = chain.open.mode === 'addend' ? `${chain.open.known} + ${shown ?? 'buit'}` : shown === null ? 'buit' : String(shown)
  return `Cadena de dòmino: ${parts.join(', ')}, i al costat ${open}, que ha de valer ${chain.open.target}`
}
