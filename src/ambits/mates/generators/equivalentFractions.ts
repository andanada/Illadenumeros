import type { Choice, GenerateContext, Item, VisualModel } from '../../../core/ambit/types'
import { buildChoices, buildTextChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const frac = (n: number, d: number): string => `${n}/${d}`
const pizza = (n: number, d: number): VisualModel => (d <= 12 && n < d ? { kind: 'fraction', parts: d, selected: n } : { kind: 'none' })

/** Reduced fractions below one, with small terms. */
const BASES: readonly (readonly [number, number])[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [4, 9]]

/** "2/3 = ?/6": the missing numerator (E9). */
function missingNumerator(ctx: GenerateContext): Item {
  const { rng } = ctx
  const [p, q] = rng.pick(BASES)
  const k = rng.int(2, 4)
  const answer = p * k
  const list: Candidate[] = [
    { value: p + q * (k - 1), misconception: 'fraction-additive' },
    { value: q * k, misconception: 'denominator-as-count' },
    { value: answer + 1, misconception: 'off-by-one' },
    { value: p, misconception: 'fraction-one-part-only' },
  ]
  return makeItem(
    {
      skillId: 'E9',
      text: `${frac(p, q)} = ?/${q * k}`,
      speech: `Quin nombre falta? ${p} sobre ${q} és igual a quant sobre ${q * k}?`,
      answer,
      choices: buildChoices(answer, list, rng, { min: 1, max: 40 }),
      visual: pizza(p, q),
      hints: [
        `Mira per quant s’ha multiplicat el denominador: de ${q} a ${q * k}.`,
        `El que fas a baix, ho has de fer a dalt: ${q} × ${k} = ${q * k}, així que ${p} × ${k}.`,
        `${p} × ${k} = ${answer}, per tant ${frac(p, q)} = ${frac(answer, q * k)}`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** "Simplifica 6/8": divide both terms by the same number (E9). */
function simplify(ctx: GenerateContext): Item {
  const { rng } = ctx
  const [p, q] = rng.pick(BASES)
  const k = rng.int(2, 6)
  const n = p * k
  const d = q * k
  const partial = [2, 3, 4, 5].filter((j) => k % j === 0 && j < k).map((j) => ({ value: frac(n / j, d / j) }))
  const candidates = [
    { value: frac(p, d), misconception: 'fraction-one-part-only' as const },
    { value: frac(n, q), misconception: 'fraction-one-part-only' as const },
    ...(n - k >= 1 && d - k > n - k ? [{ value: frac(n - k, d - k), misconception: 'fraction-additive' as const }] : []),
    ...partial,
    { value: frac(p + 1, q), misconception: 'off-by-one' as const },
    { value: frac(p, q + 1), misconception: 'off-by-one' as const },
  ]
  return makeItem(
    {
      skillId: 'E9',
      text: `Simplifica ${frac(n, d)}.`,
      speech: `Simplifica la fracció ${n} sobre ${d}.`,
      answer: frac(p, q),
      choices: buildTextChoices(frac(p, q), candidates, rng),
      visual: pizza(n, d),
      hints: [`Busca un nombre que divideixi alhora ${n} i ${d}.`, `El més gran que els divideix és ${gcd(n, d)}: ${n} : ${gcd(n, d)} i ${d} : ${gcd(n, d)}.`, `${n} : ${k} = ${p}, ${d} : ${k} = ${q}, per tant ${frac(n, d)} = ${frac(p, q)}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Which of these fractions is equivalent to p/q? (E9). */
function pickEquivalent(ctx: GenerateContext): Item {
  const { rng } = ctx
  const [p, q] = rng.pick(BASES)
  const k = rng.int(2, 4)
  const answer = frac(p * k, q * k)
  const candidates = [
    { value: frac(p + q * (k - 1), q * k), misconception: 'fraction-additive' as const },
    { value: frac(p, q * k), misconception: 'fraction-one-part-only' as const },
    { value: frac(p * k, q * k + 1), misconception: 'off-by-one' as const },
    { value: frac(p + 1, q * k), misconception: 'off-by-one' as const },
  ]
  const choices: Choice[] = buildTextChoices(answer, candidates, rng)
  return makeItem(
    {
      skillId: 'E9',
      text: `Quina d’aquestes fraccions és equivalent a ${frac(p, q)}?`,
      speech: `Quina fracció és equivalent a ${p} sobre ${q}?`,
      answer,
      choices,
      visual: pizza(p, q),
      hints: [`Dues fraccions són equivalents si representen la mateixa part del tot.`, `Multiplica dalt i baix pel mateix nombre: ${p} × ${k} i ${q} × ${k}.`, `${frac(p, q)} = ${answer}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Equivalent fractions and simplifying (E9). */
export function generateEquivalentFractions(ctx: GenerateContext): Item {
  const r = ctx.rng.next()
  return r < 0.4 ? missingNumerator(ctx) : r < 0.75 ? simplify(ctx) : pickEquivalent(ctx)
}
