import type { Item } from '../../../core/ambit/types'
import { expectedAnswer5e } from './expectedAnswer5e.testutil'

/** Test-only: independent recomputation of the right answer from an item's own data. */

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))
export const euros = (cents: number): string => `${Math.floor(cents / 100)},${pad2(cents % 100)} €`

const roundTo = (n: number, unit: number): number => Math.floor((n + unit / 2) / unit) * unit
const nums = (text: string): number[] => (text.match(/\d+/g) ?? []).map(Number)

function roundingAnswer(text: string): string | undefined {
  const unit = /centena/.test(text) ? 100 : /desena/.test(text) ? 10 : undefined
  if (unit === undefined) return undefined
  const [a, b] = nums(text)
  if (a === undefined) return undefined
  if (/\+/.test(text) && b !== undefined) return String(roundTo(a, unit) + roundTo(b, unit))
  if (/−/.test(text) && b !== undefined) return String(roundTo(a, unit) - roundTo(b, unit))
  return String(roundTo(a, unit))
}

function missingNumberAnswer(text: string): string | undefined {
  const patterns: [RegExp, (x: number, y: number) => number][] = [
    [/^\? × (\d+) = (\d+)$/, (b, c) => c / b],
    [/^(\d+) × \? = (\d+)$/, (a, c) => c / a],
    [/^(\d+) : \? = (\d+)$/, (a, c) => a / c],
    [/^\? : (\d+) = (\d+)$/, (b, c) => b * c],
  ]
  for (const [re, solve] of patterns) {
    const m = re.exec(text)
    if (m) return String(solve(Number(m[1]), Number(m[2])))
  }
  return undefined
}

/** "3 × 4 = 12, 12 − 5 = 7": every step must be right; returns the last result. */
export function checkWorkedSteps(worked: string): string | undefined {
  const steps = [...worked.matchAll(/(\d+) ([+−×:]) (\d+) = (\d+)/g)]
  if (steps.length < 2) return undefined
  const ops: Record<string, (x: number, y: number) => number> = {
    '+': (x, y) => x + y,
    '−': (x, y) => x - y,
    '×': (x, y) => x * y,
    ':': (x, y) => x / y,
  }
  for (const s of steps) {
    const fn = ops[s[2] as string]
    if (!fn || fn(Number(s[1]), Number(s[3])) !== Number(s[4])) return undefined
  }
  return steps[steps.length - 1]?.[4]
}

function operandsAnswer(item: Item): string | undefined {
  if (!item.operands) return undefined
  const { a, b, op } = item.operands
  if (item.skillId === 'A5') return String(10 - a)
  if (item.skillId === 'C9') return euros(a - b)
  if (item.skillId === 'D6') {
    if (/residu/.test(item.text)) return String(a % b)
    return /quocient/.test(item.text) ? String(Math.floor(a / b)) : undefined
  }
  if (op === '×') return String(a * b)
  if (op === ':') return String(a / b)
  return String(op === '+' ? a + b : a - b)
}

function visualAnswer(item: Item): string | undefined {
  const v = item.hintVisual
  switch (v.kind) {
    case 'compare':
      return v.left < v.right ? '<' : v.left > v.right ? '>' : '='
    case 'blocks':
      return String(v.hundreds * 100 + v.tens * 10 + v.ones)
    case 'numberLine':
      return String(v.target)
    case 'dots':
      return item.skillId === 'A1' ? String(v.groups.reduce((s, g) => s + g, 0)) : String(v.groups[1])
    case 'fraction':
      return v.collection === undefined ? `${v.selected}/${v.parts}` : String((v.collection / v.parts) * v.selected)
    case 'money':
      return euros(v.coins.reduce((s, c) => s + c, 0))
    default:
      return undefined
  }
}

export function expectedAnswer(item: Item): string | undefined {
  if (item.skillId.startsWith('E')) return expectedAnswer5e(item)
  if (item.skillId === 'D8') return roundingAnswer(item.text)
  if (item.skillId === 'D9') return missingNumberAnswer(item.text)
  if (item.skillId === 'C10') return checkWorkedSteps(item.hints[2])
  return item.operands ? operandsAnswer(item) : visualAnswer(item)
}
