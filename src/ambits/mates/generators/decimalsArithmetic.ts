import type { GenerateContext, Item } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'
import { CHARACTERS } from './catalan'
import { buildDecimalChoices, type DecimalCandidate } from './decimalChoices'
import { formatDecimal } from './decimals'
import { makeItem } from './itemFactory'

/** A decimal in hundredths with one or two decimals (1,5 or 2,35), between 1 and 9,99. */
function pickDecimal(rng: Rng, minTenths = 10): number {
  return rng.next() < 0.5 ? rng.int(minTenths, 99) * 10 : rng.int(minTenths * 10 + 1, 999)
}

/** The number written without its comma ("1,25" → 125, "2,5" → 25). */
const stripComma = (h: number): number => Number(formatDecimal(h).replace(',', ''))

function candidatesFor(a: number, b: number, add: boolean): DecimalCandidate[] {
  const answer = add ? a + b : a - b
  const misaligned = add ? stripComma(a) + stripComma(b) : Math.abs(stripComma(a) - stripComma(b))
  const list: DecimalCandidate[] = [
    { value: misaligned, misconception: 'decimal-misaligned' },
    { value: answer + 10, misconception: 'off-by-one' },
    { value: answer - 10, misconception: 'off-by-one' },
  ]
  if (add && (a % 100) + (b % 100) >= 100) list.push({ value: answer - 100, misconception: 'no-carry' })
  if (!add) list.push({ value: a + b, misconception: 'operation-swap' })
  if (!add && a % 100 < b % 100) list.push({ value: (Math.floor(a / 100) - Math.floor(b / 100)) * 100 + Math.abs((a % 100) - (b % 100)), misconception: 'no-carry' })
  return list.filter((c) => c.value !== answer)
}

/** Add or subtract decimals, bare or in a story about lengths and capacities (E3). */
export function generateDecimalArithmetic(ctx: GenerateContext): Item {
  const { rng } = ctx
  const add = rng.next() < 0.5
  const b = pickDecimal(rng, 5)
  const a = add ? pickDecimal(rng) : b + rng.int(11, 400)
  const answer = add ? a + b : a - b
  const story = rng.next() < 0.4
  const name = rng.pick(CHARACTERS)
  const [x, y] = [formatDecimal(a), formatDecimal(b)]
  const text = !story
    ? `${x} ${add ? '+' : '−'} ${y} = ?`
    : add
      ? `${name} té un pitxer amb ${x} L d’aigua i un altre amb ${y} L. Quants litres hi ha en total?`
      : `${name} té ${x} m de cinta i en gasta ${y} m. Quants metres en queden?`
  const op = add ? '+' : '−'
  const aligned = [formatDecimal(a, true), formatDecimal(b, true)]
  return makeItem(
    {
      skillId: 'E3',
      text,
      speech: story ? text : `Quant fa ${x} ${add ? 'més' : 'menys'} ${y}?`,
      answer: formatDecimal(answer),
      choices: buildDecimalChoices(answer, candidatesFor(a, b, add), rng, { min: 1, max: 2000 }),
      visual: { kind: 'none' },
      hints: [
        'Posa els nombres un sota l’altre, coma sota coma.',
        `Omple els buits amb zeros: ${aligned[0]} ${op} ${aligned[1]}. Opera com amb enters i baixa la coma.`,
        `${aligned[0]} ${op} ${aligned[1]} = ${formatDecimal(answer, true)}`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}
