import type { Item } from '../../../../core/ambit/types'

/**
 * Sharing out the farm's feed (division). `each`: a shared among b bowls, how many in each. `groups`: a put
 * in cartons of b, how many cartons fill up. `remainder`: what is left after sharing equally (en sobren).
 */
export type ShareMode = 'each' | 'groups' | 'remainder'

export interface ShareTask {
  readonly mode: ShareMode
  readonly total: number
  /** Group size (`groups`) or number of animals (`each`, `remainder`). */
  readonly size: number
  /** Bowls / cartons on the floor. */
  readonly parts: number
  readonly expected: number
  readonly remainder: number
}

export const SHARE_MAX_TOTAL = 40
export const SHARE_MAX_PARTS = 8
const SHARE_MAX_SIZE = 10

const GROUPS_RE = /\b(plats?|caixes|caixa|grups?|safates?|cartons?) de\b/i

function modeOf(text: string): ShareMode {
  if (GROUPS_RE.test(text)) return 'groups'
  return /residu/i.test(text) ? 'remainder' : 'each'
}

export function shareFromItem(item: Item): ShareTask | undefined {
  const ops = item.operands
  if (!ops || ops.op !== ':' || ops.b < 2 || ops.a < ops.b || ops.a > SHARE_MAX_TOTAL) return undefined
  const mode = modeOf(item.text)
  const quotient = Math.floor(ops.a / ops.b)
  const remainder = ops.a % ops.b
  const expected = mode === 'remainder' ? remainder : quotient
  if (String(expected) !== item.answer) return undefined
  // a : b is the same number whether b animals share it or boxes of b fill up: pick the one that fits the floor.
  const asGroups = mode === 'groups' || (mode === 'each' && ops.b > SHARE_MAX_PARTS)
  if (asGroups && ops.b <= SHARE_MAX_SIZE && quotient <= SHARE_MAX_PARTS) return { mode: 'groups', total: ops.a, size: ops.b, parts: quotient, expected, remainder }
  if (mode === 'groups' && ops.b <= SHARE_MAX_PARTS) return { mode: 'each', total: ops.a, size: ops.b, parts: ops.b, expected, remainder }
  if (mode === 'groups' || ops.b > SHARE_MAX_PARTS) return undefined
  return { mode, total: ops.a, size: ops.b, parts: ops.b, expected, remainder }
}

export interface ShareReading {
  readonly ready: boolean
  /** What the child answers with, when ready. */
  readonly value: number | undefined
  readonly left: number
}

/** Reads the bowls and the pile: ready when the sharing looks done in the way the question asks. Pure. */
export function evaluateShare(task: ShareTask, bowls: readonly number[], pile: number): ShareReading {
  const notReady = { ready: false, value: undefined, left: pile }
  if (task.mode === 'groups') {
    const full = bowls.filter((n) => n === task.size).length
    return full > 0 ? { ready: true, value: full, left: pile } : notReady
  }
  const first = bowls[0] ?? 0
  if (first === 0 || bowls.some((n) => n !== first)) return notReady
  return { ready: true, value: task.mode === 'remainder' ? pile : first, left: pile }
}

export const leftoverSaid = (n: number): string => (n <= 0 ? '' : n === 1 ? 'En sobra 1.' : `En sobren ${n}.`)

export function shareRequest(task: ShareTask): { text: string; speech: string } {
  if (task.mode === 'groups') {
    const text = `Tinc ${task.total} ous. Posa’ls en caixes de ${task.size}. Quantes caixes s’omplen?`
    return { text, speech: text }
  }
  const text =
    task.mode === 'remainder'
      ? `Reparteix ${task.total} cubs de gra entre ${task.size} animals, tots igual. Quants en sobren?`
      : `Reparteix ${task.total} cubs de gra entre ${task.size} animals, tots igual. Quants en toca a cadascun?`
  return { text, speech: text }
}
