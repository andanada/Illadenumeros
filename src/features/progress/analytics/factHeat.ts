import { addKey, mulKey } from '../../../ambits/mates/generators/itemFactory'
import { isFluent, medianRt, type FactState } from '../../../core/engine/leitner'
import { FLUENCY_LENIENCY } from '../../../core/progress/applyAnswer'

export type FactKind = 'add' | 'mul'
export type HeatMode = 'precisio' | 'caixa' | 'fluidesa'
export const HEAT_MODES: readonly { id: HeatMode; label: string }[] = [
  { id: 'precisio', label: 'Precisió' },
  { id: 'caixa', label: 'Caixa de repàs' },
  { id: 'fluidesa', label: 'Fluïdesa' },
]

export const GRID_SIZE = 10
/** Fluency targets of the skills these facts belong to (see skills.ts). */
const TARGET_MS: Record<FactKind, number> = { add: 3000, mul: 4000 }
const HIGH_ACCURACY = 0.8
const MID_ACCURACY = 0.5

export interface CellMode {
  /** Key of the legend / colour class. */
  tone: string
  /** Shape or digit drawn in the cell, so colour is never the only cue. */
  symbol: string
}

export interface FactCell {
  row: number
  col: number
  key: string
  practised: boolean
  attempts: number
  correct: number
  box: number
  medianMs: number | undefined
  modes: Record<HeatMode, CellMode>
}

const EMPTY: CellMode = { tone: 'buit', symbol: '' }

function accuracyMode(attempts: number, correct: number): CellMode {
  const accuracy = correct / attempts
  if (accuracy >= HIGH_ACCURACY) return { tone: 'alta', symbol: '●' }
  if (accuracy >= MID_ACCURACY) return { tone: 'mitjana', symbol: '◐' }
  return { tone: 'baixa', symbol: '○' }
}

const keyFor = (kind: FactKind, a: number, b: number): string => (kind === 'add' ? addKey(a, b) : mulKey(a, b))

function buildCell(kind: FactKind, row: number, col: number, state: FactState | undefined): FactCell {
  const key = keyFor(kind, row, col)
  if (!state || state.attempts <= 0) {
    return { row, col, key, practised: false, attempts: 0, correct: 0, box: 0, medianMs: undefined, modes: { precisio: EMPTY, caixa: EMPTY, fluidesa: EMPTY } }
  }
  const correct = Math.min(state.correct, state.attempts)
  const fluent = isFluent(state, TARGET_MS[kind] * FLUENCY_LENIENCY)
  return {
    row,
    col,
    key,
    practised: true,
    attempts: state.attempts,
    correct,
    box: state.box,
    medianMs: medianRt(state),
    modes: {
      precisio: accuracyMode(state.attempts, correct),
      caixa: { tone: `caixa-${state.box}`, symbol: String(state.box) },
      fluidesa: fluent ? { tone: 'fluent', symbol: '★' } : { tone: 'no-fluent', symbol: '…' },
    },
  }
}

/** 10 x 10 grid (rows 1..10, columns 1..10); commutative facts share a key, so both cells show the same state. */
export function buildFactGrid(kind: FactKind, states: Readonly<Record<string, FactState | undefined>>): FactCell[][] {
  return Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => {
      const key = keyFor(kind, r + 1, c + 1)
      return buildCell(kind, r + 1, c + 1, states[key])
    }),
  )
}

export const formatSeconds = (ms: number): string => `${(ms / 1000).toFixed(1).replace('.', ',')} s`

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)
/** "de 6", but "d’1" / "d’11" (spoken with a vowel). */
const deNumber = (n: number): string => (n === 1 || n === 11 ? `d’${n}` : `de ${n}`)

/** Text for the tooltip and the accessible name: "7 × 8: 5 encerts de 6, caixa 3, 4,2 s". */
export function factCellText(kind: FactKind, cell: FactCell): string {
  const sign = kind === 'add' ? '+' : '×'
  const head = `${cell.row} ${sign} ${cell.col}`
  if (!cell.practised) return `${head}: encara no practicat`
  const time = cell.medianMs === undefined ? 'sense temps' : formatSeconds(cell.medianMs)
  return `${head}: ${cell.correct} ${plural(cell.correct, 'encert', 'encerts')} ${deNumber(cell.attempts)}, caixa ${cell.box}, ${time}`
}
