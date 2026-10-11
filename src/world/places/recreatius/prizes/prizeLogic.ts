import type { Item } from '../../../../core/ambit/types'
import { isInteger } from '../../../errands/adapters'
import { parseMissing } from '../../../errands/missingNumber'
import { countWord } from '../../../errands/requestText'

/** Most prizes the tray holds (adds and takes stay within 20, products within 40). */
export const PRIZE_MAX = 40

export interface Toy {
  /** Def of the objects of a request (their own, apart from the claw machine's prizes). */
  readonly id: string
  readonly one: string
  readonly many: string
  readonly gender: 'f' | 'm'
}

export const TOYS: readonly Toy[] = [
  { id: 'joguina-osset', one: 'osset de peluix', many: 'ossets de peluix', gender: 'm' },
  { id: 'joguina-cotxet', one: 'cotxet de joguina', many: 'cotxets de joguina', gender: 'm' },
  { id: 'joguina-vareta', one: 'vareta màgica', many: 'varetes màgiques', gender: 'f' },
  { id: 'joguina-tiquet', one: 'tiquet', many: 'tiquets', gender: 'm' },
]

const hash = (text: string): number => [...text].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)
export const toyFor = (seed: string): Toy => TOYS[hash(seed) % TOYS.length] ?? (TOYS[0] as Toy)

/**
 * What the clerk asks for, in prizes on the tray:
 * - sum:     a + b     → put a + b on the tray            → answer = prizes on the tray
 * - missing: a + ? = t → the tray holds a, add up to t    → answer = prizes added
 * - take:    a − b     → the tray holds a, take b out     → answer = prizes left
 * - times:   a × b     → a rows of b                      → answer = prizes on the tray
 */
export type PrizeMode = 'sum' | 'missing' | 'take' | 'times'

export interface PrizeTask {
  readonly mode: PrizeMode
  readonly toy: Toy
  readonly a: number
  readonly b: number
  /** Prizes lying on the tray when the clerk asks. */
  readonly start: number
}

export function prizeFromItem(item: Item): PrizeTask | undefined {
  if (!isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const toy = toyFor(item.id)
  const ops = item.operands
  if (!ops) {
    const m = parseMissing(item.text)
    return m && m.unknown === 'second' && m.b === answer && m.t <= 20 ? { mode: 'missing', toy, a: m.a, b: m.b, start: m.a } : undefined
  }
  const { a, b, op } = ops
  if (a < 0 || b < 0) return undefined
  const missingText = item.text.includes('?') && !item.text.trim().endsWith('?')
  if (op === '+' && !missingText && answer === a + b && a + b <= 20) return { mode: 'sum', toy, a, b, start: 0 }
  if (op === '+' && missingText && answer === b && a + b <= 20) return { mode: 'missing', toy, a, b, start: a }
  if (op === '-' && answer === a - b && a <= 20 && b <= a) return { mode: 'take', toy, a, b, start: a }
  if (op === '×' && answer === a * b && a >= 1 && b >= 1 && a * b <= PRIZE_MAX && b <= 10) return { mode: 'times', toy, a, b, start: 0 }
  return undefined
}

/** Prizes on the tray that answer right. */
export const solutionPrizes = (t: PrizeTask): number => (t.mode === 'take' ? t.a - t.b : t.mode === 'times' ? t.a * t.b : t.a + t.b)

/** The number the tray gives as an answer. */
export const prizeValue = (t: PrizeTask, onTray: number): number => (t.mode === 'missing' ? onTray - t.start : onTray)

export function prizeRequest(t: PrizeTask): { text: string; speech: string } {
  const { toy, a, b } = t
  const them = toy.gender === 'f' ? 'Posa-les' : 'Posa’ls'
  switch (t.mode) {
    case 'sum':
      return { text: `Vull ${a} + ${b} ${toy.many}! ${them} a la safata.`, speech: `Vull ${a} més ${b} ${toy.many}! ${them} a la safata.` }
    case 'missing':
      return { text: `Tinc ${countWord(a, toy.one, toy.many)}, però en vull ${a + b}: ${a} + ? = ${a + b}. Posa els que falten!`, speech: `Tinc ${countWord(a, toy.one, toy.many)}, però en vull ${a + b}. Posa els que falten!` }
    case 'take':
      return { text: `${a} − ${b}: tinc ${countWord(a, toy.one, toy.many)} a la safata i me’n sobren ${b}. Treu-ne ${b}!`, speech: `${a} menys ${b}: tinc ${countWord(a, toy.one, toy.many)} a la safata i me’n sobren ${b}. Treu-ne ${b}!` }
    case 'times':
      return { text: `${a} × ${b}: vull ${a} files de ${b} ${toy.many}! ${them} a la safata.`, speech: `${a} per ${b}: vull ${a} files de ${b} ${toy.many}! ${them} a la safata.` }
  }
}
