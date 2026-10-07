import type { Item } from '../../core/ambit/types'
import { breakdown, formatEuros, parseEuros, payStatus, sumCents, type PayStatus } from '../../ui/visual/moneyLogic'

export type ShopPlan = { mode: 'pay'; target: number } | { mode: 'choices' }

/** Change questions ("Quant canvi li tornen?") are played by handing the change over, not by picking a number. */
const CHANGE_RE = /\bcanvi\b/i

/**
 * Pay mode needs a change question whose answer is an amount, and only in the concrete stage
 * (pictorial and abstract stages answer with the choices next to the money picture).
 */
export function planFromItem(item: Item): ShopPlan {
  const target = parseEuros(item.answer)
  const isAmount = /€|cts|cèntim|euro/i.test(item.answer)
  if (target !== undefined && target > 0 && isAmount && CHANGE_RE.test(item.text) && item.cpaStage === 'concret') return { mode: 'pay', target }
  return { mode: 'choices' }
}

/** Adds a piece to the counter (new array). */
export const addPiece = (pieces: readonly number[], cents: number): readonly number[] => [...pieces, cents]

/** Removes the piece at `index` (new array). */
export const removePiece = (pieces: readonly number[], index: number): readonly number[] => pieces.filter((_, i) => i !== index)

export interface PayVerdict {
  status: PayStatus
  total: number
  message: string
}

/** Kind message about the counter: never punishing. */
export function verdict(pieces: readonly number[], target: number): PayVerdict {
  const total = sumCents(pieces)
  const status = payStatus(total, target)
  const message =
    total === 0
      ? 'Arrossega monedes i bitllets al taulell'
      : status === 'exact'
        ? `Perfecte! Tens ${formatEuros(total)}. Prem «Ja està!»`
        : status === 'short'
          ? `Tens ${formatEuros(total)}. Encara en falten`
          : `Tens ${formatEuros(total)}. És massa: toca una peça per treure-la`
  return { status, total, message }
}

/** The solution pieces shown after three tries. */
export const solutionPieces = (target: number): readonly number[] => breakdown(target)

/** Choice value used when the child confirms a wrong total: the matching choice if there is one, never the answer. */
export function wrongValueFor(total: number, answer: string, choices: readonly { value: string }[] = []): string {
  const match = choices.find((c) => parseEuros(c.value) === total && c.value !== answer)
  if (match) return match.value
  const text = formatEuros(total)
  return text === answer ? `${text} ` : text
}
