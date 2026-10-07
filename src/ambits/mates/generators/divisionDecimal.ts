import type { GenerateContext, Item } from '../../../core/ambit/types'
import { CHARACTERS } from './catalan'
import { buildDecimalChoices, type DecimalCandidate } from './decimalChoices'
import { formatDecimal } from './decimals'
import { makeItem } from './itemFactory'

/** Fractional parts (hundredths) that make `divisor` divide a whole dividend exactly. */
const DECIMAL_PARTS: Readonly<Record<number, readonly number[]>> = { 2: [50], 4: [25, 50, 75], 5: [20, 40, 60, 80] }

interface Division {
  dividend: number
  divisor: number
  /** Quotient in hundredths. */
  quotient: number
}

function pickDivision(ctx: GenerateContext): Division {
  const { rng } = ctx
  if (rng.next() < 0.3) {
    const divisor = rng.int(3, 9)
    const q = rng.int(12, 99)
    return { dividend: divisor * q, divisor, quotient: q * 100 }
  }
  const divisor = rng.pick([2, 4, 5])
  const quotient = rng.int(2, 30) * 100 + rng.pick(DECIMAL_PARTS[divisor] ?? [50])
  return { dividend: (quotient * divisor) / 100, divisor, quotient }
}

function candidates({ dividend, divisor, quotient }: Division): DecimalCandidate[] {
  const whole = Math.floor(dividend / divisor)
  const rest = dividend % divisor
  if (rest === 0) {
    return [
      { value: quotient + 100, misconception: 'adjacent-fact' },
      { value: quotient - 100, misconception: 'adjacent-fact' },
      { value: whole * 1000, misconception: 'place-value-zero' },
      { value: whole * 10, misconception: 'place-value-zero' },
    ]
  }
  const list: DecimalCandidate[] = [
    { value: whole * 100, misconception: 'remainder-forgotten' },
    { value: whole * 100 + rest * 10, misconception: 'remainder-as-decimal' },
    { value: quotient + 100, misconception: 'off-by-one' },
    { value: Math.round(quotient / 10), misconception: 'decimal-place-value' },
  ]
  return list.filter((c) => c.value !== quotient)
}

function hintsFor({ dividend, divisor, quotient }: Division): [string, string, string] {
  const whole = Math.floor(dividend / divisor)
  const rest = dividend % divisor
  const result = formatDecimal(quotient)
  if (rest === 0) {
    return [`Divideix xifra a xifra, de l’esquerra a la dreta, entre ${divisor}.`, `Comprova-ho: ${divisor} × ${whole} = ${dividend}.`, `${dividend} : ${divisor} = ${result}`]
  }
  return [
    `Primer divideix les unitats: ${dividend} : ${divisor} fa ${whole} i en sobren ${rest}.`,
    `Posa la coma al quocient i baixa un zero: ${rest} unitats són ${rest * 10} dècimes, i ${rest * 10} : ${divisor} dona la part decimal.`,
    `${dividend} : ${divisor} = ${result}`,
  ]
}

/** Long division by one digit, with an exact decimal quotient (3,5 / 2,25 / 4,2) or a whole one (E5). */
export function generateDivisionDecimal(ctx: GenerateContext): Item {
  const { rng } = ctx
  const division = pickDivision(ctx)
  const { dividend, divisor, quotient } = division
  const story = rng.next() < 0.4
  const text = story ? `${rng.pick(CHARACTERS)} reparteix ${dividend} m de cinta entre ${divisor} amics. Quants metres rep cada amic?` : `${dividend} : ${divisor} = ?`
  return makeItem(
    {
      skillId: 'E5',
      text,
      speech: story ? text : `Quant fa ${dividend} entre ${divisor}?`,
      answer: formatDecimal(quotient),
      choices: buildDecimalChoices(quotient, candidates(division), rng, { min: 1, max: 20000 }),
      visual: dividend <= 120 ? { kind: 'share', total: dividend, groups: divisor } : { kind: 'none' },
      hints: hintsFor(division),
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}
