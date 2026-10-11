import type { Choice, Item } from '../../../../core/ambit/types'
import { wrongValueFor } from '../../../../games/botiga-pluja/shopLogic'
import { formatEuros, parseEuros, purseFor } from '../../../../ui/visual/moneyLogic'

/** Change errands: the neighbour paid, the child hands the change over with coins from the till drawer. */
export interface PayTask {
  target: number
  /** Pieces in the till drawer: the exact change and a few spare (each can be used once). */
  drawer: readonly number[]
}

const CHANGE_RE = /\bcanvi\b/i
const AMOUNT_RE = /€|cts|cèntim|euro/i

export function payFromItem(item: Item): PayTask | undefined {
  const target = parseEuros(item.answer)
  if (target === undefined || target <= 0 || !AMOUNT_RE.test(item.answer) || !CHANGE_RE.test(item.text)) return undefined
  return { target, drawer: purseFor(target) }
}

/** The choice the customer's hand stands for: the answer when exact, else the matching wrong choice (with its misconception) or the plain amount. */
export function payChoice(total: number, item: Item): Choice {
  if (total === parseEuros(item.answer)) return { value: item.answer }
  const value = wrongValueFor(total, item.answer, item.choices)
  return item.choices.find((c) => c.value === value) ?? { value }
}

/** The neighbour speaks in the first person when the item says who paid what. */
export function payRequest(item: Item): { text: string; speech: string } {
  const ops = item.operands
  if (ops && ops.op === '-' && ops.a > ops.b) {
    const text = `Això costa ${formatEuros(ops.b)} i et pago amb ${formatEuros(ops.a)}. Quant canvi em tornes? Dona-me’l amb monedes!`
    return { text, speech: text }
  }
  return { text: `${item.text} Dona el canvi amb monedes!`, speech: `${item.speech || item.text} Dona el canvi amb monedes!` }
}
