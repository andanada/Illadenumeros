import type { Problem } from '../shared/arith/problem'

export type JarMode = 'sum' | 'make' | 'sobra' | 'falta'

export interface Segment {
  readonly id: string
  readonly amount: number
  readonly kind: 'ingredient' | 'used' | 'hidden'
  readonly label: string
}

export interface Jar {
  readonly mode: JarMode
  /** Size of the measuring jar: 10, 20 or 100. */
  readonly capacity: number
  readonly segments: readonly Segment[]
  /** What the child is asked, in Catalan. */
  readonly caption: string
}

/** The recipe jar: 10 for small numbers, 20 for bridging, 100 for tens. */
export const jarCapacity = (top: number): 10 | 20 | 100 => (top <= 10 ? 10 : top <= 20 ? 20 : 100)

/** Subtractions are told as "sobra" (what is left) or "falta" (what is missing), alternating by seed. */
export const subtractionMode = (seed: number): 'sobra' | 'falta' => (seed % 2 === 0 ? 'sobra' : 'falta')

function ing(id: string, amount: number): Segment {
  return { id, amount, kind: 'ingredient', label: String(amount) }
}

export function buildJar(problem: Problem, seed: number): Jar {
  const { kind, a, b, answer, top } = problem
  if (kind === 'sum') {
    return {
      mode: 'sum',
      capacity: jarCapacity(top),
      segments: [ing('a', a), ing('b', b)],
      caption: `La recepta porta ${a} i ${b}. Quant hi ha a la gerra?`,
    }
  }
  if (kind === 'missing') {
    return {
      mode: 'make',
      capacity: jarCapacity(top),
      segments: [ing('a', a), { id: 'x', amount: answer, kind: 'hidden', label: '?' }],
      caption: `La recepta necessita exactament ${top}. Ja hi ha ${a}. Quant falta?`,
    }
  }
  const capacity = jarCapacity(top)
  if (subtractionMode(seed) === 'sobra') {
    return {
      mode: 'sobra',
      capacity,
      segments: [{ id: 'used', amount: b, kind: 'used', label: String(b) }, { id: 'x', amount: answer, kind: 'hidden', label: '?' }],
      caption: `A la gerra hi ha ${a} i la recepta en gasta ${b}. Quant en sobra?`,
    }
  }
  return {
    mode: 'falta',
    capacity,
    segments: [ing('b', b), { id: 'x', amount: answer, kind: 'hidden', label: '?' }],
    caption: `Tens ${b} i la recepta en vol ${a}. Quant en falta?`,
  }
}

/** Total filled by the segments (the hidden one counts with its real amount). */
export const filled = (jar: Jar): number => jar.segments.reduce((sum, s) => sum + s.amount, 0)

/** Bridging help: "fes 10 primer" when an addition crosses a ten. Undefined when it does not. */
export function bridgeHint(problem: Problem): string | undefined {
  if (problem.kind !== 'sum') return undefined
  const { a, b } = problem
  const big = Math.max(a, b)
  const small = Math.min(a, b)
  const toTen = (10 - (big % 10)) % 10
  if (toTen === 0 || toTen >= small) return undefined
  return `Omple fins a ${big + toTen} amb ${toTen} i afegeix-hi els ${small - toTen} que queden.`
}

/** Spoken description of the jar for the accessible name. */
export function describeJar(jar: Jar, shown: number | null): string {
  const parts = jar.segments.map((s) => (s.kind === 'hidden' ? (shown === null ? 'buit' : String(shown)) : `${s.kind === 'used' ? 'gastat ' : ''}${s.amount}`))
  return `Gerra de ${jar.capacity}: ${parts.join(' i ')}.`
}
