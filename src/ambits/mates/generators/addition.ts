import type { GenerateContext, Item } from '../../../core/ambit/types'
import { factsForSkill } from '../facts'
import { additionCandidates, buildChoices } from './distractors'
import { addKey, makeItem, parseFactKey } from './itemFactory'

function factOperands(skillId: string, ctx: GenerateContext): { a: number; b: number } {
  const parsed = ctx.factKey ? parseFactKey(ctx.factKey) : undefined
  const fromKey = parsed?.kind === 'add' && factsForSkill(skillId).includes(ctx.factKey ?? '') ? parsed : undefined
  const fact = fromKey ?? parseFactKey(ctx.rng.pick(factsForSkill(skillId)))
  if (!fact) throw new Error(`Sense fets per a ${skillId}`)
  // Ask commutative facts in both orders.
  return ctx.rng.next() < 0.5 ? { a: fact.a, b: fact.b } : { a: fact.b, b: fact.a }
}

function strategyHint(skillId: string, a: number, b: number): string {
  if (skillId === 'A7') {
    const small = Math.min(a, b)
    return a === b ? `És un doble: ${a} i ${a} més.` : `Pensa en el doble: ${small} + ${small} = ${small * 2}, i un més.`
  }
  if (skillId === 'A8') {
    const big = Math.max(a, b)
    const small = Math.min(a, b)
    const need = 10 - big
    return `Fes 10 primer: ${big} + ${need} = 10, i et queden ${small - need}.`
  }
  return `Comença pel més gran, ${Math.max(a, b)}, i compta ${Math.min(a, b)} més.`
}

/** Single-digit addition facts (A4, A7, A8). */
export function generateFactAddition(skillId: string, ctx: GenerateContext): Item {
  const { a, b } = factOperands(skillId, ctx)
  const sum = a + b
  return makeItem(
    {
      skillId,
      factKey: addKey(a, b),
      text: `${a} + ${b} = ?`,
      speech: `Quant fa ${a} més ${b}?`,
      answer: sum,
      choices: buildChoices(sum, additionCandidates(a, b), ctx.rng, { min: 0, max: 20 }),
      visual: { kind: 'tenFrame', a, b, op: '+' },
      hints: ['Mira els punts i compta’ls tots.', strategyHint(skillId, a, b), `${a} + ${b} = ${sum}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '+' },
    },
    ctx.rng,
  )
}

/** Add tens: 30 + 40 or 47 + 10 (B4). */
export function generateAddTens(ctx: GenerateContext): Item {
  const { rng } = ctx
  const multiples = rng.next() < 0.5
  const a = multiples ? rng.int(1, 9) * 10 : rng.int(11, 89)
  const b = rng.int(1, multiples ? Math.max(1, 9 - a / 10) : Math.floor((99 - a) / 10)) * 10
  return twoDigitItem('B4', a, b, ctx, `Compta de 10 en 10 des de ${a}.`)
}

/** Two-digit + one-digit, with and without carrying (B5). */
export function generateAdd2d1d(ctx: GenerateContext): Item {
  const { rng } = ctx
  const a = rng.int(11, 89)
  const b = rng.int(2, 9)
  const strategy = (a % 10) + b >= 10 ? `Fes desena: ${a} + ${10 - (a % 10)} = ${a + 10 - (a % 10)}, i suma la resta.` : `Suma les unitats: ${a % 10} + ${b}.`
  return twoDigitItem('B5', a, b, ctx, strategy)
}

/** Mental addition of two 2-digit numbers (B7, addition half). */
export function generateAdd2d2d(ctx: GenerateContext): Item {
  const { rng } = ctx
  const a = rng.int(11, 79)
  const b = rng.int(11, 99 - a)
  return twoDigitItem('B7', a, b, ctx, `Primer les desenes: ${a} + ${b - (b % 10)}, després ${b % 10} més.`)
}

function twoDigitItem(skillId: string, a: number, b: number, ctx: GenerateContext, strategy: string): Item {
  const sum = a + b
  return makeItem(
    {
      skillId,
      text: `${a} + ${b} = ?`,
      speech: `Quant fa ${a} més ${b}?`,
      answer: sum,
      choices: buildChoices(sum, additionCandidates(a, b), ctx.rng, { min: 0, max: 199 }),
      visual: { kind: 'numberLine', from: Math.floor(a / 10) * 10, to: Math.min(199, Math.ceil((sum + 1) / 10) * 10), start: a, target: sum },
      hints: ['Fes servir la recta numèrica: salts de 10 i d’1.', strategy, `${a} + ${b} = ${sum}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '+' },
    },
    ctx.rng,
  )
}
