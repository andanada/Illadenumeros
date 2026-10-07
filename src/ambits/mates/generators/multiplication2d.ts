import type { GenerateContext, Item } from '../../../core/ambit/types'
import { buildChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

/** Typical errors for a 2-digit × 2-digit product: a missing row, a lost zero, a lost carry. */
export function twoByTwoCandidates(a: number, b: number): Candidate[] {
  const tens = Math.floor(b / 10)
  const ones = b % 10
  const product = a * b
  const list: Candidate[] = [
    { value: a * ones, misconception: 'partial-product-missing' },
    { value: a * tens * 10, misconception: 'partial-product-missing' },
    { value: a * ones + a * tens, misconception: 'place-value-zero' },
    { value: a * ones + a * tens * 10 - 10 * Math.floor((a * ones) / 10), misconception: 'no-carry' },
    { value: product + 10, misconception: 'off-by-one' },
    { value: product - 10, misconception: 'off-by-one' },
  ]
  return list.filter((c) => c.value !== product && c.value > 0)
}

/** 2-digit × 2-digit by splitting the second factor in tens and ones (E4). */
export function generateMult2d2d(ctx: GenerateContext): Item {
  const { rng } = ctx
  const a = rng.int(12, 49)
  const tens = rng.int(1, 4)
  const ones = rng.int(1, 9)
  const b = tens * 10 + ones
  const product = a * b
  const rowTens = a * tens * 10
  const rowOnes = a * ones
  return makeItem(
    {
      skillId: 'E4',
      text: `${a} × ${b} = ?`,
      speech: `Quant fa ${a} per ${b}?`,
      answer: product,
      choices: buildChoices(product, twoByTwoCandidates(a, b), rng, { min: 1, max: product * 2 }),
      visual: { kind: 'none' },
      hints: [
        `Descompon ${b} en ${tens * 10} + ${ones} i fes dues files de multiplicació.`,
        `Primer ${a} × ${ones} = ${rowOnes}; després ${a} × ${tens * 10} = ${rowTens} (no et deixis el zero).`,
        `${a} × ${ones} = ${rowOnes}, ${a} × ${tens * 10} = ${rowTens}, ${rowOnes} + ${rowTens} = ${product}`,
      ],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '×' },
    },
    rng,
  )
}
