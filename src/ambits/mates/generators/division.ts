import type { GenerateContext, Item } from '../../../core/ambit/types'
import { factsForSkill } from '../facts'
import { CHARACTERS, CONTAINERS, countOf, howMany, THINGS } from './catalan'
import { buildChoices, divisionCandidates, type Candidate } from './distractors'
import { divKey, makeItem, parseFactKey } from './itemFactory'

function factOperands(skillId: string, ctx: GenerateContext): { a: number; b: number } {
  const facts = factsForSkill(skillId)
  const known = ctx.factKey && facts.includes(ctx.factKey) ? ctx.factKey : undefined
  const fact = parseFactKey(known ?? ctx.rng.pick(facts))
  if (!fact || fact.kind !== 'div' || fact.b === 0) throw new Error(`Sense fets de dividir per a ${skillId}`)
  return { a: fact.a, b: fact.b }
}

/** Exact division facts (C7, D4): 18 : 2, thought of as the inverse of a table. */
export function generateDivisionFact(skillId: string, ctx: GenerateContext): Item {
  const { a, b } = factOperands(skillId, ctx)
  const q = a / b
  return makeItem(
    {
      skillId,
      factKey: divKey(a, b),
      text: `${a} : ${b} = ?`,
      speech: `Quant fa ${a} entre ${b}?`,
      answer: q,
      choices: buildChoices(q, divisionCandidates(a, b), ctx.rng, { min: 0, max: 100 }),
      visual: { kind: 'share', total: a, groups: b },
      hints: [`Reparteix ${a} en ${b} plats iguals.`, `Pensa en la taula del ${b}: ${b} × ? = ${a}.`, `${a} : ${b} = ${q}, perquè ${b} × ${q} = ${a}`],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: ':' },
    },
    ctx.rng,
  )
}

/** Sharing (partitive) and grouping (quotitive) word problems (C6). */
export function generateDivConcept(ctx: GenerateContext): Item {
  const { rng } = ctx
  const b = rng.int(2, 5)
  const q = rng.int(2, 6)
  const a = b * q
  const name = rng.pick(CHARACTERS)
  const noun = rng.pick(THINGS)
  const sharing = rng.next() < 0.5
  const box = rng.pick(CONTAINERS)
  const text = sharing
    ? `${name} reparteix ${countOf(a, noun)} entre ${b} amics a parts iguals. ${howMany(noun)} rep cada amic?`
    : `${name} posa ${countOf(a, noun)} en ${box.plural} de ${b}. ${howMany(box)} omple?`
  return makeItem(
    {
      skillId: 'C6',
      text,
      speech: text,
      answer: q,
      choices: buildChoices(q, divisionCandidates(a, b), rng, { min: 0, max: 60 }),
      visual: { kind: 'share', total: a, groups: sharing ? b : q },
      hints: [
        sharing ? `Dona’n ${noun.feminine ? 'una' : 'un'} a cada amic, i torna a començar fins que no en quedin.` : `Fes grups de ${b} fins que no en quedin.`,
        sharing ? `Quantes vegades cap el ${b} dins del ${a}? ${b} × ? = ${a}.` : `Compta de ${b} en ${b} fins a arribar a ${a}.`,
        `${a} : ${b} = ${q}, perquè ${b} × ${q} = ${a}`,
      ],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: ':' },
    },
    rng,
  )
}

function remainderCandidates(q: number, r: number, a: number, b: number, askRemainder: boolean): Candidate[] {
  if (askRemainder) {
    return [
      { value: q, misconception: 'remainder-forgotten' },
      { value: 0, misconception: 'remainder-forgotten' },
      { value: r + 1, misconception: 'off-by-one' },
      { value: b - r, misconception: 'wrong-direction' },
    ]
  }
  return [
    { value: q + 1, misconception: 'adjacent-fact' },
    { value: r, misconception: 'remainder-forgotten' },
    { value: a - b, misconception: 'div-as-sub' },
    { value: q - 1, misconception: 'adjacent-fact' },
  ]
}

/** Division with remainder, asking explicitly for the quotient or the remainder (D6). */
export function generateDivRemainder(ctx: GenerateContext): Item {
  const { rng } = ctx
  const b = rng.int(2, 9)
  const q = rng.int(1, 9)
  const r = rng.int(1, b - 1)
  const a = b * q + r
  const askRemainder = rng.next() < 0.5
  const answer = askRemainder ? r : q
  const left = r === 1 ? 'en sobra 1' : `en sobren ${r}`
  return makeItem(
    {
      skillId: 'D6',
      text: `${a} : ${b}. Quin és el ${askRemainder ? 'residu' : 'quocient'}?`,
      speech: `Dividim ${a} entre ${b}. Quin és el ${askRemainder ? 'residu, el que sobra' : 'quocient'}?`,
      answer,
      choices: buildChoices(answer, remainderCandidates(q, r, a, b, askRemainder), rng, { min: 0, max: 99 }),
      visual: { kind: 'share', total: a, groups: b },
      hints: [
        `Reparteix ${a} en ${b} plats iguals i mira quants en sobren.`,
        `Busca a la taula del ${b} el número més gran que no passa de ${a}: ${b} × ${q} = ${b * q}.`,
        `${a} : ${b} fa ${q} i ${left}: el quocient és ${q} i el residu és ${r}.`,
      ],
      cpaStage: ctx.cpaStage,
      operands: { a, b, op: ':' },
    },
    rng,
  )
}
