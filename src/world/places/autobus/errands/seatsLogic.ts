import type { Item } from '../../../../core/ambit/types'
import { isInteger } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'

/** The bus has two ten-frames of seats (2 rows × 5 each, one on each side of the middle door). */
export const SEATS = 20
export const FRAME = 10
/** People who wait at the stop besides the ones the errand needs, so she has to count, not just "all". */
export const EXTRA_WAITING = 2

/**
 * Passenger errands:
 * - on:      a + b = ?   → a seated, b get on               → answer = passengers on board
 * - missing: a + ? = t   → a seated, get on until there are t → answer = passengers who got on
 * - off:     a − b = ?   → a seated, b get off               → answer = passengers left
 */
export type SeatsMode = 'on' | 'missing' | 'off'

export interface SeatsTask {
  mode: SeatsMode
  a: number
  b: number
  /** Passengers seated when the bus arrives. */
  start: number
  /** People waiting at the stop when the bus arrives. */
  waiting: number
}

/** "8 + ? = 10", "10 = 3 + ?", "? + 2 = 9" read from an item's text (A3, A10 have no operands). */
export function parseMissing(text: string): { a: number; b: number; t: number; unknown: 'first' | 'second' } | undefined {
  const clean = text.replace(/\s+/g, ' ').trim()
  const after = /^(\d+) \+ \? = (\d+)$/.exec(clean)
  const before = /^(\d+) = (\d+) \+ \?$/.exec(clean)
  const second = after ? { a: Number(after[1]), t: Number(after[2]) } : before ? { a: Number(before[2]), t: Number(before[1]) } : undefined
  if (second) return second.t >= second.a ? { a: second.a, b: second.t - second.a, t: second.t, unknown: 'second' } : undefined
  const left = /^\? \+ (\d+) = (\d+)$/.exec(clean)
  if (left) {
    const b = Number(left[1])
    const t = Number(left[2])
    return t >= b ? { a: t - b, b, t, unknown: 'first' } : undefined
  }
  return undefined
}

const task = (mode: SeatsMode, a: number, b: number): SeatsTask => ({
  mode,
  a,
  b,
  start: a,
  waiting: mode === 'off' ? 0 : b + EXTRA_WAITING,
})

export function seatsFromItem(item: Item): SeatsTask | undefined {
  if (!isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const ops = item.operands
  if (ops) {
    const { a, b, op } = ops
    if (a < 0 || b < 0) return undefined
    const missingText = item.text.includes('?') && !item.text.trim().endsWith('?')
    if (op === '+' && answer === a + b && a + b <= SEATS && !missingText) return task('on', a, b)
    if (op === '+' && answer === b && a + b <= SEATS && missingText) return task('missing', a, b)
    if (op === '-' && answer === a - b && a <= SEATS && b <= a) return task('off', a, b)
    return undefined
  }
  const m = parseMissing(item.text)
  if (m && m.unknown === 'second' && m.t <= SEATS && answer === m.b) return task('missing', m.a, m.b)
  return undefined
}

/** Answer given by the bus, from the passengers on board. */
export const seatsValue = (t: SeatsTask, onBoard: number): number => (t.mode === 'missing' ? onBoard - t.start : onBoard)

/** Passengers on board that answer right (shown as the solution). */
export const solutionOnBoard = (t: SeatsTask): number => (t.mode === 'off' ? t.a - t.b : t.a + t.b)

/** Who is where: seated on the bus and waiting at the stop (passenger seeds). People are never lost, only moved. */
export interface Crowd {
  onBoard: readonly string[]
  atStop: readonly string[]
}

export const startCrowd = (t: SeatsTask, seed: string): Crowd => ({
  onBoard: Array.from({ length: t.start }, (_, i) => `${seed}-s${i}`),
  atStop: Array.from({ length: t.waiting }, (_, i) => `${seed}-w${i}`),
})

/** The first one in the queue gets on (only if somebody waits and a seat is free). Pure. */
export function getOn(c: Crowd): Crowd {
  const [first, ...rest] = c.atStop
  if (first === undefined || c.onBoard.length >= SEATS) return c
  return { onBoard: [...c.onBoard, first], atStop: rest }
}

/** One passenger gets off onto the stop (the last one seated, or the one tapped). Pure. */
export function getOff(c: Crowd, who?: string): Crowd {
  const id = who ?? c.onBoard[c.onBoard.length - 1]
  if (id === undefined || !c.onBoard.includes(id)) return c
  return { onBoard: c.onBoard.filter((p) => p !== id), atStop: [id, ...c.atStop] }
}

/** Seat index → [frame, row, column] in ten-frame order: each frame fills its top row, then its bottom row. */
export function seatPlace(index: number): { frame: number; row: number; col: number } {
  const frame = Math.floor(index / FRAME)
  const within = index % FRAME
  return { frame, row: Math.floor(within / 5), col: within % 5 }
}

const people = (n: number): string => countWord(n, 'passatger', 'passatgers')

export function seatsRequest(t: SeatsTask): { text: string; speech: string } {
  const { a, b } = t
  switch (t.mode) {
    case 'on':
      return {
        text: `${a} + ${b}: hi ha ${people(a)} i en pugen ${b}. Fes-los pujar i tanca les portes!`,
        speech: `${a} més ${b}: hi ha ${people(a)} i en pugen ${b}. Fes-los pujar i tanca les portes!`,
      }
    case 'missing':
      return {
        text: `Hi ha ${people(a)} i n’hi han de ser ${a + b}: ${a} + ? = ${a + b}. Fes pujar els que falten!`,
        speech: `Hi ha ${people(a)} i n’hi han de ser ${a + b}. Fes pujar els que falten!`,
      }
    case 'off':
      return {
        text: `${a} − ${b}: hi ha ${people(a)} i en baixen ${b}. Fes-los baixar i tanca les portes!`,
        speech: `${a} menys ${b}: hi ha ${people(a)} i en baixen ${b}. Fes-los baixar i tanca les portes!`,
      }
  }
}
