import type { Item } from '../../core/ambit/types'

export const MAX_ROWS = 10
export const MAX_COLS = 12
export const MAX_TRAY = 60

export type TrayPlan =
  | { mode: 'array'; rows: number; cols: number }
  | { mode: 'partials'; a: number; b: number }
  | { mode: 'plain' }

/** Decides how an item is played: a tray of rows x cols, partial products with blocks, or plain choices. */
export function planFromItem(item: Item): TrayPlan {
  const ops = item.operands
  if (ops && ops.op === '×' && ops.a > 0 && ops.b > 0) {
    if (ops.a <= MAX_ROWS && ops.b <= MAX_COLS && ops.a * ops.b <= MAX_TRAY) return { mode: 'array', rows: ops.a, cols: ops.b }
    if (ops.a >= 10 && ops.a <= 99 && ops.b >= 2 && ops.b <= 9) return { mode: 'partials', a: ops.a, b: ops.b }
  }
  for (const visual of [item.visual, item.hintVisual]) {
    if (visual.kind === 'array' && visual.rows <= MAX_ROWS && visual.cols <= MAX_COLS) return { mode: 'array', rows: visual.rows, cols: visual.cols }
  }
  return { mode: 'plain' }
}

const rowsWord = (n: number): string => (n === 1 ? 'fila' : 'files')

/** Live caption under the tray: "3 files de 4 = 12". */
export function trayCaption(rows: number, cols: number, placed: number): string {
  const total = rows * cols
  const count = Math.min(Math.max(0, placed), total)
  if (count === 0) return `Fes ${rows} ${rowsWord(rows)} de ${cols}`
  const full = Math.floor(count / cols)
  const rest = count % cols
  if (full === 0) return `${rest}`
  const head = `${full} ${rowsWord(full)} de ${cols}`
  return rest === 0 ? `${head} = ${count}` : `${head} + ${rest} = ${count}`
}

/** Tray index (row-major) that the next cupcake lands on, or undefined when the tray is full. */
export function nextSlot(placed: number, total: number): number | undefined {
  return placed < total ? placed : undefined
}

/** Column split used as a strategy hint (6x7 = 6x5 + 6x2); undefined for tiny tables. */
export function splitColumns(cols: number): [number, number] | undefined {
  if (cols > 5) return [5, cols - 5]
  if (cols >= 4) return [2, cols - 2]
  return undefined
}

/** Caption of the split strategy: "6 × 5 + 6 × 2 = 30 + 12". */
export function splitCaption(rows: number, cols: number): string | undefined {
  const split = splitColumns(cols)
  if (!split) return undefined
  const [x, y] = split
  return `${rows} × ${x} + ${rows} × ${y} = ${rows * x} + ${rows * y}`
}

export interface Partial {
  label: string
  value: number
}

/** Partial products of a two-digit number times a digit: 23 × 4 = 20 × 4 + 3 × 4. */
export function partialProducts(a: number, b: number): [Partial, Partial] {
  const tens = Math.floor(a / 10) * 10
  const ones = a % 10
  return [
    { label: `${tens} × ${b}`, value: tens * b },
    { label: `${ones} × ${b}`, value: ones * b },
  ]
}

/** Hundreds/tens/ones breakdown of a value, to draw it with base-ten blocks. */
export function toBlocks(value: number): { hundreds: number; tens: number; ones: number } {
  const v = Math.max(0, Math.floor(value))
  return { hundreds: Math.floor(v / 100), tens: Math.floor((v % 100) / 10), ones: v % 10 }
}
