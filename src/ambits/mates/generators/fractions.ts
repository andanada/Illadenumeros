import type { GenerateContext, Item } from '../../../core/ambit/types'
import { CHARACTERS, countOf, howMany, THINGS } from './catalan'
import { buildChoices, buildTextChoices, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

interface Fraction {
  parts: number
  selected: number
  glyph: string
  /** Read aloud / used in sentences: "la meitat", "un terç", "tres quarts". */
  name: string
}

const HALF: Fraction = { parts: 2, selected: 1, glyph: '½', name: 'la meitat' }
const THIRD: Fraction = { parts: 3, selected: 1, glyph: '⅓', name: 'un terç' }
const QUARTER: Fraction = { parts: 4, selected: 1, glyph: '¼', name: 'un quart' }
const THREE_QUARTERS: Fraction = { parts: 4, selected: 3, glyph: '¾', name: 'tres quarts' }

const UNIT_FRACTIONS = [HALF, THIRD, QUARTER] as const
const D7_FRACTIONS = [HALF, THIRD, QUARTER, THREE_QUARTERS, THREE_QUARTERS] as const

const fractionText = (f: { parts: number; selected: number }): string => `${f.selected}/${f.parts}`

function collectionCandidates(f: Fraction, total: number, answer: number): Candidate[] {
  const unit = total / f.parts
  const list: Candidate[] = [
    { value: f.parts, misconception: 'denominator-as-count' },
    { value: total - answer, misconception: 'wrong-direction' },
    { value: total - f.parts, misconception: 'div-as-sub' },
    { value: answer + 1, misconception: 'off-by-one' },
  ]
  return f.selected > 1 ? [{ value: unit, misconception: 'denominator-as-count' }, ...list] : list
}

function collectionItem(skillId: string, f: Fraction, total: number, ctx: GenerateContext): Item {
  const { rng } = ctx
  const unit = total / f.parts
  const answer = unit * f.selected
  const story = skillId === 'D7' && rng.next() < 0.5
  const name = rng.pick(CHARACTERS)
  const noun = rng.pick(THINGS)
  const text = story ? `${name} té ${countOf(total, noun)} i en regala ${f.name}. ${howMany(noun)} regala?` : `Quant és ${f.glyph} de ${total}?`
  const steps = f.selected > 1 ? `${total} : ${f.parts} = ${unit}, i ${f.selected} grups són ${f.selected} × ${unit} = ${answer}.` : `${total} : ${f.parts} = ${unit}.`
  return makeItem(
    {
      skillId,
      text,
      speech: story ? text : `Quant és ${f.name} de ${total}?`,
      answer,
      choices: buildChoices(answer, collectionCandidates(f, total, answer), rng, { min: 0, max: total }),
      visual: { kind: 'fraction', parts: f.parts, selected: f.selected, collection: total },
      hints: [`Reparteix els ${total} en ${f.parts} grups iguals.`, `${f.glyph} vol dir ${f.selected} de les ${f.parts} parts iguals: ${steps}`, `${f.glyph} de ${total} = ${answer}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** "Which part is coloured?" on a whole cut in equal parts (C8). */
function wholeItem(f: Fraction, ctx: GenerateContext): Item {
  const answer = fractionText(f)
  const candidates = [
    { value: `${f.parts}/${f.selected}`, misconception: 'denominator-as-count' as const },
    { value: `${f.parts - f.selected}/${f.parts}`, misconception: 'wrong-direction' as const },
    ...UNIT_FRACTIONS.filter((u) => u.parts !== f.parts).map((u) => ({ value: fractionText(u), misconception: 'off-by-one' as const })),
  ]
  return makeItem(
    {
      skillId: 'C8',
      text: 'Quina part està pintada?',
      speech: 'Quina part del pastís està pintada?',
      answer,
      choices: buildTextChoices(answer, candidates, ctx.rng),
      visual: { kind: 'fraction', parts: f.parts, selected: f.selected },
      hints: [
        'Compta en quantes parts iguals està tallat.',
        `Està tallat en ${f.parts} parts iguals i n’hi ha ${f.selected} de pintada: és ${f.name}.`,
        `És ${answer} (${f.glyph}).`,
      ],
      cpaStage: ctx.cpaStage,
    },
    ctx.rng,
  )
}

/** ½ ⅓ ¼ of a collection or of a whole (C8). */
export function generateUnitFraction(ctx: GenerateContext): Item {
  const f = ctx.rng.pick(UNIT_FRACTIONS)
  if (ctx.rng.next() < 0.35) return wholeItem(f, ctx)
  return collectionItem('C8', f, f.parts * ctx.rng.int(2, 5), ctx)
}

/** ½ ⅓ ¼ ¾ of a collection, with or without a short story (D7). */
export function generateFractionOfCollection(ctx: GenerateContext): Item {
  const f = ctx.rng.pick(D7_FRACTIONS)
  return collectionItem('D7', f, f.parts * ctx.rng.int(2, 10), ctx)
}
