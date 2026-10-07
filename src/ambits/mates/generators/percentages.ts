import type { Choice, GenerateContext, Item } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'
import { CHARACTERS } from './catalan'
import { buildChoices, type Candidate } from './distractors'
import { buildDecimalChoices, type DecimalCandidate } from './decimalChoices'
import { makeItem } from './itemFactory'
import { formatEuros } from './money'

const PERCENTS = [10, 25, 50] as const
type Percent = (typeof PERCENTS)[number]
const FRACTION_NAME: Record<Percent, string> = { 10: 'la desena part', 25: 'un quart', 50: 'la meitat' }
const DIVISOR: Record<Percent, number> = { 10: 10, 25: 4, 50: 2 }

/** Singular goods: indefinite article + noun, so gender is always right ("Una jaqueta", "Un llibre"). */
const GOODS: readonly { art: string; name: string }[] = [
  { art: 'Una', name: 'jaqueta' },
  { art: 'Un', name: 'llibre' },
  { art: 'Una', name: 'pilota' },
  { art: 'Un', name: 'joc de taula' },
  { art: 'Una', name: 'motxilla' },
  { art: 'Un', name: 'patinet' },
]

/** (price in euros, percentage) pairs whose result is a whole number of euros. */
const SHOP_PRICES = [20, 40, 60, 80, 100, 120, 160, 200] as const
/** Pairs whose final price is below 20 € so the bill and the change fit in the purse. */
const PAY_CASES: readonly (readonly [number, Percent])[] = [[10, 10], [10, 50], [20, 10], [20, 25], [20, 50], [30, 50]]
const BILLS = [5, 10, 20] as const

const discountOf = (price: number, pct: Percent): number => price / DIVISOR[pct]

/** "Quant és el 25 % de 80?" (E10). */
function percentOf(ctx: GenerateContext): Item {
  const { rng } = ctx
  const pct = rng.pick(PERCENTS)
  const total = rng.int(1, 10) * 20
  const answer = discountOf(total, pct)
  const wrongFraction = PERCENTS.filter((p) => p !== pct).map((p) => ({ value: discountOf(total, p), misconception: 'percent-wrong-fraction' as const }))
  const list: Candidate[] = [{ value: pct, misconception: 'percent-as-amount' }, ...wrongFraction, { value: total - answer, misconception: 'wrong-direction' }]
  const text = `Quant és el ${pct} % de ${total}?`
  return makeItem(
    {
      skillId: 'E10',
      text,
      speech: `Quant és el ${pct} per cent de ${total}?`,
      answer,
      choices: buildChoices(answer, list, rng, { min: 1, max: total }),
      visual: { kind: 'hundredGrid', filled: pct },
      hints: [`El ${pct} % vol dir ${pct} de cada 100.`, `El ${pct} % és ${FRACTION_NAME[pct]}: ${total} : ${DIVISOR[pct]}.`, `${total} : ${DIVISOR[pct]} = ${answer}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

function priceChoices(answer: number, list: readonly DecimalCandidate[], rng: Rng, max: number): Choice[] {
  return buildDecimalChoices(answer, list, rng, { min: 100, max, format: formatEuros })
}

/** Price after a discount (E10). */
function discountedPrice(ctx: GenerateContext): Item {
  const { rng } = ctx
  const pct = rng.pick(PERCENTS)
  const price = rng.pick(SHOP_PRICES)
  const discount = discountOf(price, pct)
  const final = price - discount
  const good = rng.pick(GOODS)
  const text = `${good.art} ${good.name} costa ${formatEuros(price * 100)}. Té un descompte del ${pct} %. Quant costa ara?`
  const list: DecimalCandidate[] = [
    { value: discount * 100, misconception: 'one-step-only' },
    { value: (price + discount) * 100, misconception: 'wrong-direction' },
    { value: (price - pct) * 100, misconception: 'percent-as-amount' },
  ]
  return makeItem(
    {
      skillId: 'E10',
      text,
      speech: text,
      answer: formatEuros(final * 100),
      choices: priceChoices(final * 100, list, rng, price * 200),
      visual: { kind: 'hundredGrid', filled: pct },
      hints: [`Primer calcula el descompte: el ${pct} % és ${FRACTION_NAME[pct]}.`, `${price} : ${DIVISOR[pct]} = ${discount}. Això és el que t’estalvies, no el preu final.`, `${price} − ${discount} = ${final}`],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Discount, paying with a bill and getting change: played with coins in the shop (E10). */
function discountedChange(ctx: GenerateContext): Item {
  const { rng } = ctx
  const [price, pct] = rng.pick(PAY_CASES)
  const discount = discountOf(price, pct)
  const final = price - discount
  const paid = BILLS.find((b) => b > final) ?? 20
  const change = paid - final
  const good = rng.pick(GOODS)
  const text = `${good.art} ${good.name} costa ${formatEuros(price * 100)} i té un descompte del ${pct} %. ${rng.pick(CHARACTERS)} paga amb ${formatEuros(paid * 100)}. Quant canvi li tornen?`
  const list: DecimalCandidate[] = [
    { value: final * 100, misconception: 'one-step-only' },
    { value: (paid - discount) * 100, misconception: 'one-step-only' },
    { value: (paid - price) * 100, misconception: 'one-step-only' },
    { value: (paid + final) * 100, misconception: 'operation-swap' },
  ]
  return makeItem(
    {
      skillId: 'E10',
      text,
      speech: text,
      answer: formatEuros(change * 100),
      choices: priceChoices(change * 100, list, rng, 3000),
      visual: { kind: 'money', coins: [paid * 100] },
      hints: [
        `Dos passos: primer el preu amb descompte, després el canvi.`,
        `El ${pct} % de ${price} és ${discount}, així que el preu és ${price} − ${discount} = ${final}.`,
        `${price} − ${discount} = ${final}, ${paid} − ${final} = ${change}`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

/** Percentages, prices and discounts (E10). */
export function generatePercentages(ctx: GenerateContext): Item {
  const r = ctx.rng.next()
  return r < 0.25 ? percentOf(ctx) : r < 0.6 ? discountedPrice(ctx) : discountedChange(ctx)
}
