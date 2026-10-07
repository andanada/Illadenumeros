import type { GenerateContext, Item } from '../../../core/ambit/types'
import { buildChoices, type Candidate } from './distractors'
import { buildDecimalChoices, type DecimalCandidate } from './decimalChoices'
import { formatDecimal, speakDecimal } from './decimals'
import { makeItem } from './itemFactory'
import { hundredthsText, tenthsText, unitsText } from './place'

const reverseTwo = (h: number): number => Number(String(h).padStart(2, '0').split('').reverse().join(''))

/** "3 unitats i 5 dècimes" / "2 unitats, 3 dècimes i 4 centèsimes" → number (E1). */
function buildFromParts(ctx: GenerateContext): Item {
  const { rng } = ctx
  const units = rng.int(1, 9)
  const tenths = rng.int(1, 9)
  const withHundredths = rng.next() < 0.5
  const hundredths = withHundredths ? rng.int(1, 9) : 0
  const answer = units * 100 + tenths * 10 + hundredths
  const parts = withHundredths ? `${unitsText(units)}, ${tenthsText(tenths)} i ${hundredthsText(hundredths)}` : `${unitsText(units)} i ${tenthsText(tenths)}`
  const candidates: DecimalCandidate[] = withHundredths
    ? [
        { value: units * 100 + hundredths * 10 + tenths, misconception: 'reverse-digits' },
        { value: units * 100 + tenths + hundredths * 10, misconception: 'decimal-place-value' },
        { value: units * 100 + tenths * 10 + hundredths * 10, misconception: 'decimal-place-value' },
      ]
    : [
        { value: units * 100 + tenths, misconception: 'decimal-place-value' },
        { value: tenths * 100 + units * 10, misconception: 'reverse-digits' },
        { value: (units * 10 + tenths) * 100, misconception: 'place-value-concat' },
      ]
  const text = `Quin nombre és ${parts}?`
  return makeItem(
    {
      skillId: 'E1',
      text,
      speech: text,
      answer: formatDecimal(answer),
      choices: buildDecimalChoices(answer, candidates, rng, { min: 1, max: 99900 }),
      visual: { kind: 'hundredGrid', filled: tenths * 10 + hundredths },
      hints: [
        'Darrere de la coma, la primera xifra són dècimes i la segona, centèsimes.',
        `Les unitats van davant de la coma (${units}) i després les dècimes${withHundredths ? ' i les centèsimes' : ''}.`,
        `${parts} formen ${formatDecimal(answer)}.`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Which decimal is the coloured part of the hundred square? (E1). */
function readGrid(ctx: GenerateContext): Item {
  const { rng } = ctx
  const filled = rng.next() < 0.5 ? rng.int(1, 9) * 10 : rng.int(11, 99)
  const answer = filled
  const candidates: DecimalCandidate[] = []
  if (filled % 10 === 0) candidates.push({ value: filled / 10, misconception: 'decimal-place-value' })
  if (filled < 10) candidates.push({ value: filled * 10, misconception: 'decimal-place-value' })
  if (filled >= 10 && filled % 10 !== 0) candidates.push({ value: reverseTwo(filled), misconception: 'reverse-digits' }, { value: Math.floor(filled / 10), misconception: 'decimal-place-value' })
  candidates.push({ value: 100 - filled, misconception: 'wrong-direction' })
  const text = 'Quin nombre decimal representa la part pintada del quadrat?'
  return makeItem(
    {
      skillId: 'E1',
      text,
      speech: text,
      answer: formatDecimal(answer),
      choices: buildDecimalChoices(answer, candidates, rng, { min: 1, max: 99 }),
      visual: { kind: 'hundredGrid', filled },
      hints: [
        'El quadrat té 100 caselles. Cada columna de 10 és una dècima.',
        `Hi ha ${filled} caselles pintades de 100: ${filled} centèsimes.`,
        `${filled} caselles de 100 són ${formatDecimal(answer)} (${speakDecimal(answer)}).`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** How many tenths or hundredths are in a decimal? (E1). */
function countParts(ctx: GenerateContext): Item {
  const { rng } = ctx
  const units = rng.int(0, 9)
  const tenths = rng.int(1, 9)
  const value = units * 100 + tenths * 10
  const answer = units * 10 + tenths
  const candidates: Candidate[] = [
    { value: tenths, misconception: 'decimal-place-value' },
    { value: units, misconception: 'decimal-place-value' },
    { value: value, misconception: 'decimal-place-value' },
    { value: Number(`${tenths}${units}`), misconception: 'reverse-digits' },
  ]
  const text = `Quantes dècimes hi ha en ${formatDecimal(value)}?`
  return makeItem(
    {
      skillId: 'E1',
      text,
      speech: text,
      answer,
      choices: buildChoices(answer, candidates, rng, { min: 1, max: 999 }),
      visual: units === 0 ? { kind: 'hundredGrid', filled: tenths * 10 } : { kind: 'none' },
      hints: [
        'Una unitat té 10 dècimes.',
        `${units} ${units === 1 ? 'unitat' : 'unitats'} són ${units * 10} dècimes, i hi afegim ${tenthsText(tenths)}.`,
        `${units * 10} + ${tenths} = ${answer} dècimes`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Decimal reading and place value: tenths and hundredths (E1). */
export function generateDecimalReading(ctx: GenerateContext): Item {
  const r = ctx.rng.next()
  return r < 0.4 ? buildFromParts(ctx) : r < 0.75 ? readGrid(ctx) : countParts(ctx)
}
