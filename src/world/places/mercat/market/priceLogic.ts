import type { Item } from '../../../../core/ambit/types'
import { purseFor } from '../../../../ui/visual/moneyLogic'

/** «6,3» or «45,00 €» into cents (hundredths); undefined when there is no number. */
export function toCents(text: string): number | undefined {
  const m = /(\d+)(?:,(\d{1,2}))?/.exec(text)
  if (!m) return undefined
  return Number(m[1]) * 100 + (m[2] === undefined ? 0 : Number(m[2].padEnd(2, '0')))
}

/** An amount written the way the item writes its answer: «10,2», «2,01», «10», or «45,00 €». */
export function formatLike(answer: string, cents: number): string {
  const euros = Math.floor(cents / 100)
  const rest = cents % 100
  if (/€/.test(answer)) return `${euros},${String(rest).padStart(2, '0')} €`
  if (rest === 0) return String(euros)
  return rest % 10 === 0 ? `${euros},${rest / 10}` : `${euros},${String(rest).padStart(2, '0')}`
}

/** Grams on the scale as kilos with a Catalan comma: «0,5 kg», «2 kg». */
export function formatKg(grams: number): string {
  const kg = Math.round(grams) / 1000
  return `${String(kg).replace('.', ',')} kg`
}

export interface PriceSign {
  /** Price on the sign, in cents. */
  readonly price: number
  readonly percent: number
}

const DISCOUNT_RE = /costa (\d+(?:,\d+)?) €.*?descompte del (\d+) ?%/i

/** The sign and the tag of a discounted thing: its price and its percentage. */
export function discountOf(text: string): PriceSign | undefined {
  const m = DISCOUNT_RE.exec(text)
  const price = m?.[1] ? toCents(m[1]) : undefined
  return m && price !== undefined ? { price, percent: Number(m[2]) } : undefined
}

/** Money to hand over on the cashier tray: the total of two prices, what is left, or a new (discounted) price. */
export interface TrayTask {
  readonly kind: 'sum' | 'diff' | 'price'
  /** Cents the tray must hold. */
  readonly target: number
  readonly a?: number
  readonly b?: number
  readonly sign?: PriceSign
}

const OPS_RE = /^(\d+(?:,\d+)?) ([+−]) (\d+(?:,\d+)?) = \?$/
const AMOUNT_RE = /€/

export function trayFromItem(item: Item): TrayTask | undefined {
  const text = item.text.trim()
  const target = toCents(item.answer)
  if (target === undefined || target <= 0) return undefined
  const m = OPS_RE.exec(text)
  if (m && m[1] && m[3] && !AMOUNT_RE.test(item.answer)) {
    const a = toCents(m[1])
    const b = toCents(m[3])
    if (a === undefined || b === undefined) return undefined
    const kind = m[2] === '+' ? 'sum' : 'diff'
    return (kind === 'sum' ? a + b : a - b) === target ? { kind, target, a, b } : undefined
  }
  if (!AMOUNT_RE.test(item.answer)) return undefined
  const sign = discountOf(text)
  return { kind: 'price', target, ...(sign ? { sign } : {}) }
}

const euros = (cents: number): string => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`

export function trayRequest(task: TrayTask, itemText = ''): { text: string; speech: string } {
  if (task.kind === 'sum' && task.a !== undefined && task.b !== undefined) {
    const text = `Aquesta fruita val ${euros(task.a)} i aquesta ${euros(task.b)}. Paga-ho tot a la safata, amb monedes!`
    return { text, speech: text }
  }
  if (task.kind === 'diff' && task.a !== undefined && task.b !== undefined) {
    const text = `Tinc ${euros(task.a)} i compro una cosa de ${euros(task.b)}. Posa a la safata els diners que em queden!`
    return { text, speech: text }
  }
  const base = itemText.trim()
  const action = task.sign ? `Treu l’etiqueta del ${task.sign.percent} % i paga el que toca a la safata, amb monedes!` : 'Posa els diners a la safata, amb monedes!'
  const text = base ? `${base} ${action}` : action
  return { text, speech: text }
}

/** Pieces (cents) on the counter: the exact ones for the target and a few more, so choosing is the work. */
export function coinPile(target: number): number[] {
  return [...purseFor(target), 200, 50].slice(0, 16)
}

export interface ScaleTask {
  /** The weight the scale must read, as written: «1,9». */
  readonly kg: string
  /** Bags of a tenth of a kilo that make it. */
  readonly tenths: number
}

const MAX_BAGS = 36

/** «Quantes dècimes hi ha en 1,9?» → put 19 bags of 100 g on the scale until it reads 1,9 kg. */
export function scaleFromItem(item: Item): ScaleTask | undefined {
  const m = /^Quantes dècimes hi ha en (\d+),(\d)\?$/.exec(item.text.trim())
  if (!m || !m[1] || !m[2]) return undefined
  const tenths = Number(m[1]) * 10 + Number(m[2])
  return String(tenths) === item.answer && tenths >= 1 && tenths <= MAX_BAGS ? { kg: `${m[1]},${m[2]}`, tenths } : undefined
}
