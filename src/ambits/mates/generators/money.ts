import type { Choice, GenerateContext, Item } from '../../../core/ambit/types'
import { CHARACTERS, countOf, THINGS } from './catalan'
import { buildChoices, columnNoBorrow, type Candidate } from './distractors'
import { makeItem } from './itemFactory'

/** Euro coins and notes, in cents. */
export const EURO_VALUES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000] as const
const MAX_CENTS = 2000
const COUNT_COINS = [10, 20, 50, 100, 200] as const
const PAY_WITH = [200, 500, 1000, 2000] as const

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))

/** Catalan price format: 250 → "2,50 €". */
export const formatEuros = (cents: number): string => `${Math.floor(cents / 100)},${pad2(cents % 100)} €`

/** How a single coin is read: "50 cèntims", "1 cèntim", "2 €". */
const coinName = (cents: number): string => (cents >= 100 ? `${cents / 100} €` : `${cents} ${cents === 1 ? 'cèntim' : 'cèntims'}`)

const listOf = (words: string[]): string => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} i ${words[words.length - 1]}`)

/** "2,50 €" read as "2,05 €" or the euros taken as cents. */
function euroCentMix(cents: number): Candidate[] {
  const euros = Math.floor(cents / 100)
  const cc = cents % 100
  const list: Candidate[] = []
  if (cc % 10 === 0 && cc > 0) list.push({ value: euros * 100 + cc / 10, misconception: 'euro-cent-mix' })
  if (euros > 0 && cc > 0) list.push({ value: cc * 100 + euros, misconception: 'euro-cent-mix' })
  return list
}

function moneyChoices(answer: number, candidates: Candidate[], ctx: GenerateContext): Choice[] {
  // Typical errors first; a wrong euro or ten cents only tops the list up.
  const nearby: Candidate[] = [100, -100, 10, -10].map((d) => ({ value: answer + d, misconception: 'off-by-one' }))
  const typical = candidates.filter((c) => c.value !== answer && c.value >= 1 && c.value <= MAX_CENTS)
  const pool = typical.length >= 3 ? typical : [...typical, ...ctx.rng.shuffle(nearby).slice(0, 3 - typical.length + 1)]
  return buildChoices(answer, pool, ctx.rng, { min: 1, max: MAX_CENTS }).map((c) => ({ ...c, value: formatEuros(Number(c.value)) }))
}

/** How much money is there? (C9). */
function countMoney(ctx: GenerateContext): Item {
  const { rng } = ctx
  const coins = Array.from({ length: rng.int(2, 5) }, () => rng.pick(COUNT_COINS)).sort((x, y) => y - x)
  const total = coins.reduce((s, c) => s + c, 0)
  const euros = coins.filter((c) => c >= 100).reduce((s, c) => s + c, 0)
  const text = `Quants diners són ${listOf(coins.map(coinName))}?`
  return makeItem(
    {
      skillId: 'C9',
      text,
      speech: text,
      answer: formatEuros(total),
      choices: moneyChoices(total, euroCentMix(total), ctx),
      visual: { kind: 'money', coins },
      hints: [
        'Primer compta els euros i després els cèntims.',
        `Els euros fan ${formatEuros(euros)}; 100 cèntims són 1 euro.`,
        `En total són ${formatEuros(total)}.`,
      ],
      cpaStage: ctx.cpaStage,
    },
    rng,
  )
}

function changeStrategy(price: number, paid: number, toRound: number): string {
  if (toRound === 0) return `Afegeix euros fins a ${formatEuros(paid)}.`
  const first = `Primer fins a l’euro: ${formatEuros(price)} + ${formatEuros(toRound)} = ${formatEuros(price + toRound)}`
  return price + toRound === paid ? `${first}.` : `${first}, i després ${formatEuros(paid - price - toRound)} més fins a ${formatEuros(paid)}.`
}

/** Paying and getting change (C9). */
function change(ctx: GenerateContext): Item {
  const { rng } = ctx
  const price = rng.int(21, 399) * 5
  const paid = PAY_WITH.find((v) => v > price) ?? MAX_CENTS
  const back = paid - price
  const name = rng.pick(CHARACTERS)
  const thing = countOf(1, rng.pick(THINGS))
  const toRound = (100 - (price % 100)) % 100
  const text = `${name} compra ${thing} que costa ${formatEuros(price)} i paga amb ${formatEuros(paid)}. Quant canvi li tornen?`
  return makeItem(
    {
      skillId: 'C9',
      text,
      speech: text,
      answer: formatEuros(back),
      choices: moneyChoices(back, [...euroCentMix(back), { value: columnNoBorrow(paid, price), misconception: 'no-carry' }, { value: price, misconception: 'operation-swap' }], ctx),
      visual: { kind: 'money', coins: [paid] },
      hints: [
        `Compta des de ${formatEuros(price)} fins a ${formatEuros(paid)}.`,
        changeStrategy(price, paid, toRound),
        `${formatEuros(paid)} − ${formatEuros(price)} = ${formatEuros(back)}`,
      ],
      cpaStage: ctx.cpaStage,
      operands: { a: paid, b: price, op: '-' },
    },
    rng,
  )
}

/** Euros, cents and change (C9). */
export function generateMoney(ctx: GenerateContext): Item {
  return ctx.rng.next() < 0.5 ? countMoney(ctx) : change(ctx)
}
