import type { Item } from '../../../core/ambit/types'
import { formatDecimal, parseDecimal } from './decimals'

/** Test-only: independent recomputation of the 5è answers, read back from each item's own text. */

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const euros = (cents: number): string => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`
const decimals = (text: string): number[] => (text.match(/\d+(?:,\d+)?/g) ?? []).map((t) => parseDecimal(t) ?? NaN)
const ints = (text: string): number[] => (text.match(/\d+/g) ?? []).map(Number)

/** Evaluates "3 + 4 × 5", "(2 + 3) × 4" with the usual priority. */
export function evaluate(expression: string): number {
  const tokens = expression.match(/\d+|[+−×:()]/g) ?? []
  let pos = 0
  const peek = (): string | undefined => tokens[pos]
  const atom = (): number => {
    const t = tokens[pos++]
    if (t === '(') {
      const v = sum()
      pos++
      return v
    }
    return Number(t)
  }
  const product = (): number => {
    let v = atom()
    while (peek() === '×' || peek() === ':') v = tokens[pos++] === '×' ? v * atom() : v / atom()
    return v
  }
  const sum = (): number => {
    let v = product()
    while (peek() === '+' || peek() === '−') v = tokens[pos++] === '+' ? v + product() : v - product()
    return v
  }
  return sum()
}

function readingAnswer(item: Item): string | undefined {
  const { text } = item
  const build = /^Quin nombre és (.+)\?$/.exec(text)
  if (build?.[1]) {
    const part = (word: RegExp): number => Number(new RegExp(String.raw`(\d+) ${word.source}`).exec(build[1] ?? '')?.[1] ?? 0)
    return formatDecimal(part(/unita/) * 100 + part(/d[èe]cim/) * 10 + part(/cent[èe]sim/))
  }
  const hv = item.hintVisual
  if (/part pintada/.test(text) && hv.kind === 'hundredGrid') return formatDecimal(hv.filled)
  const count = /^Quantes dècimes hi ha en (.+)\?$/.exec(text)
  if (count?.[1]) return String((parseDecimal(count[1]) ?? NaN) / 10)
  return undefined
}

function compareAnswer(item: Item): string | undefined {
  const hv = item.hintVisual
  if (hv.kind === 'decimalLine') return formatDecimal(hv.target)
  if (/més gran/.test(item.text)) return formatDecimal(Math.max(...item.choices.map((c) => parseDecimal(c.value) ?? NaN)))
  const m = /^(\S+) \? (\S+)$/.exec(item.text)
  if (!m) return undefined
  const [a, b] = [parseDecimal(m[1] ?? ''), parseDecimal(m[2] ?? '')]
  if (a === undefined || b === undefined) return undefined
  return a < b ? '<' : a > b ? '>' : '='
}

function arithmeticAnswer(item: Item): string | undefined {
  const [a, b] = decimals(item.text)
  if (a === undefined || b === undefined) return undefined
  const add = /\+|total/.test(item.text)
  return formatDecimal(add ? a + b : a - b)
}

function fractionAnswer(item: Item): string | undefined {
  const { text } = item
  const missing = /^(\d+)\/(\d+) = \?\/(\d+)$/.exec(text)
  if (missing) return String((Number(missing[1]) * Number(missing[3])) / Number(missing[2]))
  const simplify = /^Simplifica (\d+)\/(\d+)\.$/.exec(text)
  if (simplify) {
    const [n, d] = [Number(simplify[1]), Number(simplify[2])]
    return `${n / gcd(n, d)}/${d / gcd(n, d)}`
  }
  const equivalent = /equivalent a (\d+)\/(\d+)\?$/.exec(text)
  if (equivalent) {
    const [p, q] = [Number(equivalent[1]), Number(equivalent[2])]
    const right = item.choices.filter((c) => {
      const [n, d] = ints(c.value)
      return n !== undefined && d !== undefined && n * q === d * p
    })
    return right.length === 1 ? right[0]?.value : undefined
  }
  return undefined
}

function powerAnswer(item: Item): string | undefined {
  const { text } = item
  const sq = /^(\d+)² = \?$/.exec(text)
  if (sq) return String(Number(sq[1]) ** 2)
  const cube = /^(\d+)³ = \?$/.exec(text)
  if (cube) return String(Number(cube[1]) ** 3)
  const root = /^Quin nombre elevat al (quadrat|cub) dona (\d+)\?$/.exec(text)
  if (root) return String(Math.round(Number(root[2]) ** (root[1] === 'cub' ? 1 / 3 : 1 / 2)))
  return undefined
}

function multiplesAnswer(item: Item): string | undefined {
  const multiple = /múltiple de (\d+)\?$/.exec(item.text)
  const divisor = /divisor de (\d+)\?$/.exec(item.text)
  const values = item.choices.map((c) => Number(c.value))
  const fits = multiple ? values.filter((v) => v % Number(multiple[1]) === 0) : divisor ? values.filter((v) => Number(divisor[1]) % v === 0) : []
  return fits.length === 1 ? String(fits[0]) : undefined
}

function percentAnswer(item: Item): string | undefined {
  const { text } = item
  const of = /^Quant és el (\d+) % de (\d+)\?$/.exec(text)
  if (of) return String((Number(of[1]) * Number(of[2])) / 100)
  const [price, pct, paid] = ints(text.replace(/(\d+),00 €/g, '$1'))
  if (price === undefined || pct === undefined) return undefined
  const final = price - (price * pct) / 100
  return /canvi/.test(text) && paid !== undefined ? euros((paid - final) * 100) : euros(final * 100)
}

/** Independent answer for E1..E10 items, or undefined when the item is not a 5è one. */
export function expectedAnswer5e(item: Item): string | undefined {
  const ints2 = ints(item.text)
  switch (item.skillId) {
    case 'E1':
      return readingAnswer(item)
    case 'E2':
      return compareAnswer(item)
    case 'E3':
      return arithmeticAnswer(item)
    case 'E4':
      return ints2[0] !== undefined && ints2[1] !== undefined ? String(ints2[0] * ints2[1]) : undefined
    case 'E5':
      return ints2[0] !== undefined && ints2[1] !== undefined ? formatDecimal((ints2[0] * 100) / ints2[1]) : undefined
    case 'E6':
      return String(evaluate(item.text.replace(/ = \?$/, '')))
    case 'E7':
      return powerAnswer(item)
    case 'E8':
      return multiplesAnswer(item)
    case 'E9':
      return fractionAnswer(item)
    case 'E10':
      return percentAnswer(item)
    default:
      return undefined
  }
}
