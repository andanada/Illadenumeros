import type { Item } from '../../../../core/ambit/types'
import { isInteger } from '../../../errands/adapters'

/** The clip tray holds two rows of ten. */
export const TRAY_MAX = 20
/** At most ten clips fit on each side of a head. */
export const SIDE_MAX = 10

/**
 * Hair-clip errands. She takes clips from the box onto the tray, then hands them over:
 * - pair: a + b = ?      → a clips on the left, b on the right; how many to take?   → answer = clips on the tray
 * - more: a + ? = t      → the customer already wears a, wants t; how many more?    → answer = clips on the tray
 */
export type ClipMode = 'pair' | 'more'

export interface ClipTask {
  mode: ClipMode
  /** pair: left / right. more: a = already worn, b = missing. */
  a: number
  b: number
  skillId: string
}

const MORE_RE = /^(\d+) \+ \? = (\d+)$/
const MORE_FIRST_RE = /^\? \+ (\d+) = (\d+)$/

export function clipFromItem(item: Item): ClipTask | undefined {
  if (!isInteger(item.answer)) return undefined
  const answer = Number(item.answer)
  const text = item.text.trim()
  const more = MORE_RE.exec(text) ?? MORE_FIRST_RE.exec(text)
  if (more) {
    const a = Number(more[1])
    const total = Number(more[2])
    if (a < 0 || total > TRAY_MAX || total - a !== answer || answer < 0) return undefined
    return { mode: 'more', a, b: answer, skillId: item.skillId }
  }
  const ops = item.operands
  if (ops?.op !== '+' || !text.endsWith('= ?')) return undefined
  if (ops.a < 0 || ops.b < 0 || ops.a > SIDE_MAX || ops.b > SIDE_MAX || ops.a + ops.b !== answer) return undefined
  return { mode: 'pair', a: ops.a, b: ops.b, skillId: item.skillId }
}

/** Clips on the tray that answer correctly. */
export const clipSolution = (task: ClipTask): number => task.b + (task.mode === 'pair' ? task.a : 0)

export const addClip = (n: number): number => Math.min(TRAY_MAX, n + 1)
export const takeClip = (n: number): number => Math.max(0, n - 1)

export type SlotState = 'worn' | 'wanted'
export interface Slot {
  side: 'left' | 'right'
  /** 0 = nearest the parting, up to SIDE_MAX - 1. */
  index: number
  state: SlotState
}

/** The places on the head: pair → a left and b right (wanted); more → a worn then b wanted, alternating sides. */
export function slotsOf(task: ClipTask): Slot[] {
  if (task.mode === 'pair') {
    return [
      ...Array.from({ length: task.a }, (_, index) => ({ side: 'left' as const, index, state: 'wanted' as const })),
      ...Array.from({ length: task.b }, (_, index) => ({ side: 'right' as const, index, state: 'wanted' as const })),
    ]
  }
  const total = task.a + task.b
  return Array.from({ length: total }, (_, k) => ({ side: k % 2 === 0 ? ('left' as const) : ('right' as const), index: Math.floor(k / 2), state: k < task.a ? ('worn' as const) : ('wanted' as const) }))
}

const word = (n: number): string => (n === 1 ? 'pinça' : 'pinces')

/** What the customer asks, with the sum written for her to read. */
export function clipRequest(task: ClipTask): { text: string; speech: string } {
  const { a, b } = task
  if (task.mode === 'more') {
    const t = a + b
    return {
      text: `Ja porto ${a} ${word(a)} i en vull ${t}: ${a} + ? = ${t}. Quantes me’n falten? Posa-les a la safata!`,
      speech: `Ja porto ${a} ${word(a)} i en vull ${t}. Quantes me’n falten? Posa-les a la safata!`,
    }
  }
  if (a === b) {
    return {
      text: `Vull ${a} ${word(a)} a cada costat: ${a} + ${b}. És un doble! Quantes n’agafes?`,
      speech: `Vull ${a} ${word(a)} a cada costat. És un doble! Quantes n’agafes en total?`,
    }
  }
  const near = Math.abs(a - b) === 1 && task.skillId === 'A7' ? ' Gairebé un doble!' : ''
  return {
    text: `Vull ${a} ${word(a)} a l’esquerra i ${b} a la dreta: ${a} + ${b}.${near} Quantes n’agafes?`,
    speech: `Vull ${a} ${word(a)} a l’esquerra i ${b} a la dreta.${near} Quantes n’agafes en total?`,
  }
}
