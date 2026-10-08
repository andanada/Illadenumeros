import type { GenerateContext, Item } from '../../../core/ambit/types'
import { factsForSkill } from '../facts'
import { countOf, deNumber, howMany, THINGS } from './catalan'
import { buildChoices, multiplicationCandidates, type Candidate } from './distractors'
import { commutativeOperands, makeItem, mulKey, parseFactKey } from './itemFactory'

/** Which tables each fact skill practises (to pick the factor the strategy talks about). */
const SKILL_TABLES: Record<string, number[]> = {
  C4: [0, 1, 2, 5, 10],
  C5: [3, 4],
  D2: [6, 9],
  D3: [7, 8],
}

function factOperands(skillId: string, ctx: GenerateContext): { a: number; b: number } {
  const facts = factsForSkill(skillId)
  const known = ctx.factKey && facts.includes(ctx.factKey) ? ctx.factKey : undefined
  const fact = parseFactKey(known ?? ctx.rng.pick(facts))
  if (!fact || fact.kind !== 'mul') throw new Error(`Sense fets de multiplicar per a ${skillId}`)
  // Ask commutative facts in both orders (or the one the session planner asked for).
  return commutativeOperands(fact, ctx)
}

/** Splits a fact into the table being practised and the other factor. */
function tableAndFactor(skillId: string, a: number, b: number): { table: number; n: number } {
  const tables = SKILL_TABLES[skillId] ?? []
  if (tables.includes(b) && !tables.includes(a)) return { table: b, n: a }
  if (tables.includes(a)) return { table: a, n: b }
  return { table: b, n: a }
}

/** Real strategies per table, e.g. 6×7 = 5×7 + 7, 9×8 = 10×8 − 8. */
export function tableStrategy(table: number, n: number): string {
  const double = 2 * n
  switch (table) {
    case 0:
      return 'Multiplicar per 0 sempre dóna 0: no hi ha res a comptar.'
    case 1:
      return `Multiplicar per 1 deixa el número igual: ${n}.`
    case 2:
      return `És el doble: ${n} + ${n} = ${double}.`
    case 3:
      return `El doble i un cop més: 2 × ${n} = ${double}, i ${double} + ${n} = ${3 * n}.`
    case 4:
      return `El doble del doble: 2 × ${n} = ${double}, i ${double} + ${double} = ${4 * n}.`
    case 5:
      return `Fes 10 × ${n} = ${10 * n} i després la meitat: ${5 * n}.`
    case 6:
      return `5 vegades i una més: 5 × ${n} = ${5 * n}, i ${5 * n} + ${n} = ${6 * n}.`
    case 7:
      return `5 vegades i 2 vegades: 5 × ${n} = ${5 * n} i 2 × ${n} = ${double}, ${5 * n} + ${double} = ${7 * n}.`
    case 8:
      return `Doble, doble i doble: 2 × ${n} = ${double}, 4 × ${n} = ${4 * n}, 8 × ${n} = ${8 * n}.`
    case 9:
      return `10 vegades i una menys: 10 × ${n} = ${10 * n}, menys ${n} = ${9 * n}.`
    default:
      return `Posa un zero al darrere: 10 × ${n} = ${10 * n}.`
  }
}

interface ProductSpec {
  skillId: string
  a: number
  b: number
  text: string
  speech: string
  strategy: string
  /** Overrides the array of cupcakes (e.g. nothing to draw for ×0). */
  visual?: Item['visual']
  worked?: string
  factKey?: string
  candidates?: Candidate[]
}

function productItem(spec: ProductSpec, ctx: GenerateContext): Item {
  const { a, b } = spec
  const product = a * b
  return makeItem(
    {
      skillId: spec.skillId,
      ...(spec.factKey !== undefined ? { factKey: spec.factKey } : {}),
      text: spec.text,
      speech: spec.speech,
      answer: product,
      choices: buildChoices(product, spec.candidates ?? multiplicationCandidates(a, b), ctx.rng, { min: 0, max: Math.max(100, product * 2) }),
      visual: spec.visual ?? { kind: 'array', rows: a, cols: b },
      hints: [`Mira les files: ${a} ${a === 1 ? 'fila' : 'files'} ${deNumber(b)}. Compta-les ${deNumber(b)} en ${b}.`, spec.strategy, spec.worked ?? `${a} × ${b} = ${product}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: '×' },
    },
    ctx.rng,
  )
}

/** Table facts (C4, C5, D2, D3) with a factor-specific strategy hint. */
export function generateTableFact(skillId: string, ctx: GenerateContext): Item {
  const { a, b } = factOperands(skillId, ctx)
  const { table, n } = tableAndFactor(skillId, a, b)
  const zero = a === 0 || b === 0
  const strategy = zero ? tableStrategy(0, 0) : n === 1 ? tableStrategy(1, table) : tableStrategy(table, n)
  return productItem(
    {
      skillId,
      a,
      b,
      factKey: mulKey(a, b),
      text: `${a} × ${b} = ?`,
      speech: `Quant fa ${a} per ${b}?`,
      strategy,
      ...(zero ? { visual: { kind: 'none' } as const } : {}),
    },
    ctx,
  )
}

/** Meaning of ×: rows of a bakery tray or repeated addition (C3). */
export function generateMultConcept(ctx: GenerateContext): Item {
  const { rng } = ctx
  const a = rng.int(2, 5)
  const b = rng.int(2, 6)
  const noun = rng.pick(THINGS)
  const sum = Array.from({ length: a }, () => String(b)).join(' + ')
  const asArray = rng.next() < 0.5
  const text = asArray
    ? `Hi ha ${a} files amb ${countOf(b, noun)} a cada fila. ${howMany(noun)} hi ha en total?`
    : `${a} vegades ${b}: ${sum} = ?`
  return productItem(
    {
      skillId: 'C3',
      a,
      b,
      text,
      speech: asArray ? text : `Quant fan ${a} vegades ${b}?`,
      strategy: `${a} × ${b} vol dir ${a} vegades ${b}: ${sum}.`,
      worked: `${sum} = ${a * b}, és a dir, ${a} × ${b} = ${a * b}`,
    },
    ctx,
  )
}

/** Typical errors for a 2-digit × 1-digit product. */
function twoDigitCandidates(a: number, b: number): Candidate[] {
  const tens = Math.floor(a / 10)
  const ones = a % 10
  const list: Candidate[] = [
    ...multiplicationCandidates(a, b),
    { value: tens * b + ones * b, misconception: 'place-value-zero' },
    { value: tens * 10 + ones * b, misconception: 'place-value-zero' },
  ]
  if (ones * b >= 10) {
    list.push({ value: tens * b * 10 + ((ones * b) % 10), misconception: 'no-carry' })
    list.push({ value: Number(`${tens * b}${ones * b}`), misconception: 'place-value-concat' })
  }
  return list.filter((c) => c.value !== a * b)
}

/** 2-digit × 1-digit by splitting tens and ones (D5). */
export function generateMult2d1d(ctx: GenerateContext): Item {
  const a = ctx.rng.int(12, 49)
  const b = ctx.rng.int(2, 9)
  const tens = a - (a % 10)
  const ones = a % 10
  const product = a * b
  const split = ones === 0 ? `${tens} × ${b} = ${product}` : `${tens} × ${b} = ${tens * b}, ${ones} × ${b} = ${ones * b}, ${tens * b} + ${ones * b} = ${product}`
  return productItem(
    {
      skillId: 'D5',
      a,
      b,
      text: `${a} × ${b} = ?`,
      speech: `Quant fa ${a} per ${b}?`,
      strategy: ones === 0 ? `Pensa ${tens / 10} × ${b} i posa un zero al darrere.` : `Descompon ${a} en ${tens} + ${ones} i multiplica cada part per ${b}.`,
      worked: split,
      candidates: twoDigitCandidates(a, b),
    },
    ctx,
  )
}
