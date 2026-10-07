import type { GenerateContext, Item } from '../../../core/ambit/types'
import { additionCandidates, buildChoices, columnNoBorrow, columnNoCarry, subtractionCandidates, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

const roundTo = (n: number, unit: number): number => Math.floor((n + unit / 2) / unit) * unit
const blocksOf = (n: number) => ({ kind: 'blocks' as const, hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 })

/** 3-digit addition or subtraction, mental or in columns (C2). */
export function generateAddSub3d(ctx: GenerateContext): Item {
  const { rng } = ctx
  const adding = rng.next() < 0.5
  const a = adding ? rng.int(100, 799) : rng.int(250, 999)
  const b = adding ? rng.int(100, 999 - a) : rng.int(100, a - 20)
  const answer = adding ? a + b : a - b
  const hundreds = b - (b % 100)
  const tens = (b % 100) - (b % 10)
  const ones = b % 10
  const sign = adding ? '+' : '−'
  const rest = [tens, ones].filter((n) => n > 0)
  const then = rest.length === 0 ? '' : `; després ${rest.join(' i ')} ${adding ? 'més' : 'menys'}`
  const candidates: Candidate[] = adding
    ? [...additionCandidates(a, b), { value: columnNoCarry(a, b), misconception: 'no-carry' }, { value: answer + 100, misconception: 'off-by-one' }]
    : [...subtractionCandidates(a, b), { value: columnNoBorrow(a, b), misconception: 'no-carry' }, { value: answer - 100, misconception: 'off-by-one' }]
  return makeItem(
    {
      skillId: 'C2',
      text: `${a} ${sign} ${b} = ?`,
      speech: `Quant fa ${a} ${adding ? 'més' : 'menys'} ${b}?`,
      answer,
      choices: buildChoices(answer, candidates.filter((c) => c.value !== answer), rng, { min: 0, max: 999 }),
      visual: blocksOf(a),
      hints: [
        `Fes servir els blocs: centenes, desenes i unitats per separat.`,
        `Primer les centenes: ${a} ${sign} ${hundreds} = ${adding ? a + hundreds : a - hundreds}${then}. ${adding ? 'Si les unitats passen de 9, porta-te’n una.' : 'Si no en tens prou, desfés una desena.'}`,
        `${a} ${sign} ${b} = ${answer}`,
      ],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: adding ? '+' : '-' },
    },
    rng,
  )
}

function roundingItem(n: number, unit: 10 | 100, ctx: GenerateContext): Item {
  const answer = roundTo(n, unit)
  const below = n - (n % unit)
  const other = answer === below ? below + unit : below
  const place = unit === 10 ? 'desena' : 'centena'
  const digit = unit === 10 ? 'unitats' : 'desenes'
  const text = `Arrodoneix ${n} a la ${place} més propera.`
  return makeItem(
    {
      skillId: 'D8',
      text,
      speech: text,
      answer,
      choices: buildChoices(answer, [
        { value: other, misconception: 'wrong-direction' },
        { value: roundTo(n, unit === 10 ? 100 : 10), misconception: 'place-value-zero' },
        { value: n, misconception: 'off-by-one' },
      ], ctx.rng, { min: 0, max: 10000 }),
      visual: { kind: 'numberLine', from: below, to: below + unit, start: n, target: answer },
      hints: [`A la recta, ${n} és entre ${below} i ${below + unit}. A quin és més a prop?`, `Mira la xifra de les ${digit}: si és 5 o més, arrodoneix cap amunt.`, `${n} s’arrodoneix a ${answer}.`],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

function estimateItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const adding = rng.next() < 0.5
  const a = adding ? rng.int(101, 799) : rng.int(350, 999)
  const b = adding ? rng.int(101, 999 - a) : rng.int(101, a - 150)
  const [ra, rb] = [roundTo(a, 100), roundTo(b, 100)]
  const answer = adding ? ra + rb : ra - rb
  const exact = adding ? a + b : a - b
  const sign = adding ? '+' : '−'
  const text = `Estima ${a} ${sign} ${b} arrodonint cada número a la centena.`
  return makeItem(
    {
      skillId: 'D8',
      text,
      speech: `Més o menys, quant fa ${a} ${adding ? 'més' : 'menys'} ${b}? Arrodoneix a la centena.`,
      answer,
      choices: buildChoices(answer, [
        { value: exact, misconception: 'off-by-one' },
        { value: answer + 100, misconception: 'wrong-direction' },
        { value: answer - 100, misconception: 'wrong-direction' },
        { value: adding ? a - (a % 100) + b - (b % 100) : a - (a % 100) - (b - (b % 100)), misconception: 'wrong-direction' },
      ].filter((c): c is Candidate => c.value !== answer), rng, { min: 0, max: 2000 }),
      visual: { kind: 'numberLine', from: Math.min(ra, answer), to: Math.max(ra, answer) + 100, start: ra, target: answer },
      hints: ['Canvia cada número per la centena més propera.', `${a} és a prop de ${ra} i ${b} és a prop de ${rb}.`, `${ra} ${sign} ${rb} = ${answer}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Rounding to tens/hundreds and estimating sums and differences (D8). */
export function generateEstimateRound(ctx: GenerateContext): Item {
  const roll = ctx.rng.next()
  if (roll < 0.35) return roundingItem(ctx.rng.int(11, 999), 10, ctx)
  if (roll < 0.7) return roundingItem(ctx.rng.int(101, 9899), 100, ctx)
  return estimateItem(ctx)
}

type MissingForm = 'factor-first' | 'factor-second' | 'divisor' | 'dividend'

/** Missing numbers in × and : equalities: ? × 4 = 28, 36 : ? = 9 (D9). */
export function generateMissingNumberOps(ctx: GenerateContext): Item {
  const { rng } = ctx
  const b = rng.int(2, 10)
  const q = rng.int(2, 10)
  const p = b * q
  const form = rng.pick<MissingForm>(['factor-first', 'factor-second', 'divisor', 'dividend'])
  const spec = {
    'factor-first': { text: `? × ${b} = ${p}`, speech: `Quin número per ${b} fa ${p}?`, answer: q, think: `Quantes vegades ${b} fan ${p}? ${p} : ${b} = ${q}.`, check: `${q} × ${b} = ${p}` },
    'factor-second': { text: `${b} × ? = ${p}`, speech: `${b} per quin número fa ${p}?`, answer: q, think: `Recita la taula del ${b} fins a arribar a ${p}.`, check: `${b} × ${q} = ${p}` },
    divisor: { text: `${p} : ? = ${q}`, speech: `${p} entre quin número fa ${q}?`, answer: b, think: `Quin número per ${q} fa ${p}? ${q} × ? = ${p}.`, check: `${p} : ${b} = ${q}` },
    dividend: { text: `? : ${b} = ${q}`, speech: `Quin número entre ${b} fa ${q}?`, answer: p, think: `Fes el contrari: ${q} × ${b}.`, check: `${p} : ${b} = ${q}` },
  }[form]
  const candidates: Candidate[] =
    form === 'dividend'
      ? [{ value: b + q, misconception: 'mult-as-add' }, { value: p + b, misconception: 'adjacent-fact' }, { value: p - b, misconception: 'adjacent-fact' }, { value: q, misconception: 'wrong-direction' }]
      : [{ value: p - (form === 'divisor' ? q : b), misconception: 'div-as-sub' }, { value: spec.answer + 1, misconception: 'adjacent-fact' }, { value: spec.answer - 1, misconception: 'adjacent-fact' }, { value: p, misconception: 'wrong-direction' }]
  return makeItem(
    {
      skillId: 'D9',
      text: spec.text,
      speech: `Quin número s’amaga? ${spec.speech}`,
      answer: spec.answer,
      choices: buildChoices(spec.answer, candidates.filter((c) => c.value !== spec.answer), rng, { min: 0, max: 200 }),
      visual: form === 'divisor' || form === 'dividend' ? { kind: 'share', total: p, groups: b } : { kind: 'array', rows: b, cols: q },
      hints: ['És com una balança: als dos costats hi ha d’haver el mateix.', spec.think, spec.check],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}
