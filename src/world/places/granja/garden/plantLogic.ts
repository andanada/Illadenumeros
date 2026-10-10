import type { Item } from '../../../../core/ambit/types'
import type { ZoneDef } from '../../../sandbox/zoneTypes'

/** A plot to sow: `rows` rows of `cols` seeds (the array model of a × b). */
export interface PlantTask {
  readonly rows: number
  readonly cols: number
  readonly total: number
}

/** Most seeds the sandbox lays out for one request. */
export const PLANT_MAX = 40
const MAX_ROWS = 6
const MAX_COLS = 10

/** a × b as an array of seeds, when the product is the item's answer and fits a plot. */
export function plantFromItem(item: Item): PlantTask | undefined {
  const ops = item.operands
  if (!ops || ops.op !== '×' || ops.a < 1 || ops.b < 1) return undefined
  const total = ops.a * ops.b
  if (String(total) !== item.answer || total > PLANT_MAX) return undefined
  // a × b = b × a: lay the plot the other way round when that is the one that fits.
  if (ops.a <= MAX_ROWS && ops.b <= MAX_COLS) return { rows: ops.a, cols: ops.b, total }
  return ops.b <= MAX_ROWS && ops.a <= MAX_COLS ? { rows: ops.b, cols: ops.a, total } : undefined
}

/** Where the request's plot lies in the garden: sized to its columns and rows, centred on the lower soil. */
export function plotZone(task: PlantTask, room: string): ZoneDef {
  const w = Math.min(0.62, 0.075 * task.cols + 0.04)
  const h = Math.min(0.35, 0.065 * task.rows + 0.03)
  return { id: 'parcel', room, rect: { x: 0.3 + (0.62 - w) / 2, y: 0.96 - h, w, h }, label: 'la parcel·la', capacity: task.total, cols: task.cols, accepts: (def) => def === 'llavor-peticio' }
}

const rowsWord = (n: number): string => `${n} ${n === 1 ? 'fila' : 'files'}`
const seedsWord = (n: number): string => `${n} ${n === 1 ? 'llavor' : 'llavors'}`

export function plantRequest(task: PlantTask): { text: string; speech: string } {
  const text = `Vull ${rowsWord(task.rows)} de ${seedsWord(task.cols)} a l’hort! Planta-les en files.`
  return { text, speech: `Vull ${rowsWord(task.rows)} de ${seedsWord(task.cols)} a l’hort!` }
}
