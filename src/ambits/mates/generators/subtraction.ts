import type { GenerateContext, Item } from '../../../core/ambit/types'
import { factsForSkill } from '../facts'
import { buildChoices, subtractionCandidates } from './distractors'
import { makeItem, parseFactKey, subKey } from './itemFactory'

function factOperands(skillId: string, ctx: GenerateContext): { a: number; b: number } {
  const known = ctx.factKey && factsForSkill(skillId).includes(ctx.factKey) ? ctx.factKey : undefined
  const fact = parseFactKey(known ?? ctx.rng.pick(factsForSkill(skillId)))
  if (!fact || fact.kind !== 'sub') throw new Error(`Sense fets de resta per a ${skillId}`)
  return { a: fact.a, b: fact.b }
}

/** Subtraction facts within 10 (A6) and within 20 crossing the ten (A9). */
export function generateFactSubtraction(skillId: string, ctx: GenerateContext): Item {
  const { a, b } = factOperands(skillId, ctx)
  const diff = a - b
  const bridges = skillId === 'A9' && a - 10 < b && a > 10
  const strategy =
    bridges
      ? `Baixa fins a 10: ${a} − ${a - 10} = 10, i després treu ${b - (a - 10)} més.`
      : `Pensa en la suma: ${b} + ? = ${a}.`
  return makeItem(
    {
      skillId,
      factKey: subKey(a, b),
      text: `${a} − ${b} = ?`,
      speech: `Quant fa ${a} menys ${b}?`,
      answer: diff,
      choices: buildChoices(diff, subtractionCandidates(a, b), ctx.rng, { min: 0, max: 20 }),
      visual: skillId === 'A9' ? { kind: 'numberLine', from: 0, to: 20, start: a, target: diff } : { kind: 'tenFrame', a, b, op: '-' },
      hints: [skillId === 'A9' ? 'Fes salts enrere a la recta.' : 'Treu els punts ratllats i compta els que queden.', strategy, `${a} − ${b} = ${diff}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '-' },
    },
    ctx.rng,
  )
}

/** Two-digit − one-digit (B6). */
export function generateSub2d1d(ctx: GenerateContext): Item {
  const a = ctx.rng.int(12, 99)
  const b = ctx.rng.int(2, 9)
  const strategy = b > a % 10 ? `Baixa fins a ${a - (a % 10)}, i després treu ${b - (a % 10)} més.` : `Resta les unitats: ${a % 10} − ${b}.`
  return twoDigitSub('B6', a, b, ctx, strategy)
}

/** Mental subtraction of two 2-digit numbers (B7, subtraction half). */
export function generateSub2d2d(ctx: GenerateContext): Item {
  const a = ctx.rng.int(30, 99)
  const b = ctx.rng.int(11, a - 5)
  return twoDigitSub('B7', a, b, ctx, `Primer treu les desenes: ${a} − ${b - (b % 10)}, després ${b % 10} més.`)
}

function twoDigitSub(skillId: string, a: number, b: number, ctx: GenerateContext, strategy: string): Item {
  const diff = a - b
  return makeItem(
    {
      skillId,
      text: `${a} − ${b} = ?`,
      speech: `Quant fa ${a} menys ${b}?`,
      answer: diff,
      choices: buildChoices(diff, subtractionCandidates(a, b), ctx.rng, { min: 0, max: 199 }),
      visual: { kind: 'numberLine', from: Math.floor(diff / 10) * 10, to: Math.ceil((a + 1) / 10) * 10, start: a, target: diff },
      hints: ['Fes salts enrere a la recta: de 10 en 10 i d’1 en 1.', strategy, `${a} − ${b} = ${diff}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '-' },
    },
    ctx.rng,
  )
}
