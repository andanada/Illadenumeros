import type { Choice, GenerateContext, Item } from '../../../core/ambit/types'
import { buildDecimalChoices, type DecimalCandidate } from './decimalChoices'
import { formatDecimal } from './decimals'
import { makeItem } from './itemFactory'

const SYMBOLS = ['<', '>', '='] as const
const symbolOf = (a: number, b: number): string => (a < b ? '<' : a > b ? '>' : '=')

/** "0,5 ? 0,45": the longer decimal looks bigger to a child who reads the digits as a whole number. */
function compareItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const equal = rng.next() < 0.2
  const tenths = rng.int(3, 9)
  const one = tenths * 10
  const two = equal ? one : (tenths - 1) * 10 + rng.int(1, 9)
  // `one` is written with one decimal (0,5); `two` has two (0,45 or 0,50), so the digits read as whole numbers are 5 and 45 (or 50).
  const oneFirst = rng.next() < 0.5
  const a = oneFirst ? one : two
  const b = oneFirst ? two : one
  const textOne = formatDecimal(one)
  const textTwo = formatDecimal(two, true)
  const written = oneFirst ? [textOne, textTwo] : [textTwo, textOne]
  const answer = symbolOf(a, b)
  const digitsOne = tenths
  const digitsTwo = Number(textTwo.slice(2))
  const naive = oneFirst ? symbolOf(digitsOne, digitsTwo) : symbolOf(digitsTwo, digitsOne)
  const choices: Choice[] = rng.shuffle(SYMBOLS.map((s) => (s !== answer && s === naive ? { value: s, misconception: 'decimal-longer-bigger' as const } : { value: s })))
  const text = `${written[0]} ? ${written[1]}`
  return makeItem(
    {
      skillId: 'E2',
      text,
      speech: `Quin signe va entre ${written[0]} i ${written[1]}?`,
      answer,
      choices,
      visual: { kind: 'hundredGrid', filled: Math.min(100, a) },
      hints: [
        'Compara primer les dècimes; si són iguals, mira les centèsimes.',
        `Escriu els dos amb les mateixes xifres: ${formatDecimal(a, true)} i ${formatDecimal(b, true)}.`,
        `${formatDecimal(a, true)} ${answer} ${formatDecimal(b, true)}`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Reads the decimal marked on a number line cut in tenths (E2). */
function lineItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const from = rng.int(0, 8)
  const target = from * 100 + rng.int(1, 9) * 10 + (rng.next() < 0.4 ? rng.int(1, 9) : 0)
  const tenth = Math.floor((target % 100) / 10)
  const candidates: DecimalCandidate[] = [
    { value: from * 100 + tenth, misconception: 'decimal-place-value' },
    { value: from * 100 + (10 - tenth) * 10, misconception: 'wrong-direction' },
    { value: (from + 1) * 100 + (target % 10), misconception: 'off-by-one' },
    { value: target + 10, misconception: 'off-by-one' },
    { value: target - 10, misconception: 'off-by-one' },
  ]
  const line = { kind: 'decimalLine' as const, from, to: from + 1, target }
  const item = makeItem(
    {
      skillId: 'E2',
      text: 'Quin nombre assenyala la fletxa a la recta?',
      speech: 'Quin nombre assenyala la fletxa a la recta?',
      answer: formatDecimal(target),
      choices: buildDecimalChoices(target, candidates, rng, { min: from * 100 + 1, max: (from + 1) * 100 - 1 }),
      visual: line,
      hints: [
        `Entre ${from} i ${from + 1} hi ha 10 espais iguals: cada marca és una dècima.`,
        `Compta quantes marques hi ha després del ${from}: ${Math.floor((target % 100) / 10)}.`,
        `La fletxa és al ${formatDecimal(target)}.`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
  // The line is the question itself, so it stays visible in the abstract stage too.
  return { ...item, visual: line }
}

/** Which is the biggest of four decimals? (E2). */
function biggestItem(ctx: GenerateContext): Item {
  const { rng } = ctx
  const tenths = rng.int(3, 9)
  const biggest = tenths * 10
  const longer = (tenths - 1) * 10 + rng.int(1, 9)
  const lower = (tenths - 2) * 10 + rng.int(1, 9)
  const lowest = (tenths - 2) * 10
  const values = rng.shuffle([biggest, longer, lower, lowest])
  const choices: Choice[] = values.map((v) => ({ value: formatDecimal(v), ...(v === longer ? { misconception: 'decimal-longer-bigger' as const } : {}) }))
  return makeItem(
    {
      skillId: 'E2',
      text: 'Quin és el nombre més gran?',
      speech: 'Quin és el nombre més gran?',
      answer: formatDecimal(biggest),
      choices,
      visual: { kind: 'none' },
      hints: ['Compara primer les dècimes de cada nombre.', 'Escriu-los amb dues xifres decimals perquè tinguin la mateixa llargada.', `El més gran és ${formatDecimal(biggest)}.`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Comparing decimals and reading them on the number line (E2). */
export function generateDecimalCompare(ctx: GenerateContext): Item {
  const r = ctx.rng.next()
  return r < 0.45 ? compareItem(ctx) : r < 0.8 ? lineItem(ctx) : biggestItem(ctx)
}
