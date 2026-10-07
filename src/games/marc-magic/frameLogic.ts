import type { Item } from '../../core/ambit/types'
import type { CellKind } from '../shared/TenFrameGrid'

/** Total cells in the double ten-frame. */
export const FRAME_CELLS = 20

export interface BoardPlan {
  mode: 'add' | 'sub' | 'count'
  /** Counters of colour 1 (the first operand, or the whole set when counting). */
  first: number
  /** Counters of colour 2 (added) or counters to cross out (subtracted). */
  second: number
}

export type BuildStep = 'build-first' | 'build-second' | 'cross' | 'answer'

export interface BoardState {
  placed: number
  crossed: readonly number[]
}

export const emptyBoard: BoardState = { placed: 0, crossed: [] }

/** Reads what the board must show from an item (A1 counting, or a + / − operation). */
export function planFromItem(item: Item): BoardPlan {
  const ops = item.operands
  if (ops && (ops.op === '+' || ops.op === '-')) {
    return { mode: ops.op === '+' ? 'add' : 'sub', first: ops.a, second: ops.b }
  }
  const dots = item.visual.kind === 'dots' ? item.visual.groups.reduce((sum, g) => sum + g, 0) : 0
  const fromHint = item.hintVisual.kind === 'dots' ? item.hintVisual.groups.reduce((sum, g) => sum + g, 0) : 0
  return { mode: 'count', first: Math.min(FRAME_CELLS, dots || fromHint || Number(item.answer) || 0), second: 0 }
}

/** Counters that must sit on the board before answering. */
export function targetPlaced(plan: BoardPlan): number {
  return plan.mode === 'add' ? plan.first + plan.second : plan.first
}

export function stepOf(plan: BoardPlan, state: BoardState): BuildStep {
  if (state.placed < plan.first) return 'build-first'
  if (plan.mode === 'add' && state.placed < targetPlaced(plan)) return 'build-second'
  if (plan.mode === 'sub' && state.crossed.length < plan.second) return 'cross'
  return 'answer'
}

/** Counters still waiting in the tray for the current step. */
export function trayCount(plan: BoardPlan, state: BoardState): number {
  const step = stepOf(plan, state)
  if (step === 'build-first') return plan.first - state.placed
  if (step === 'build-second') return targetPlaced(plan) - state.placed
  return 0
}

/** Snaps one more counter into the next free cell. */
export function placeCounter(plan: BoardPlan, state: BoardState): BoardState {
  if (state.placed >= Math.min(FRAME_CELLS, targetPlaced(plan))) return state
  const step = stepOf(plan, state)
  if (step !== 'build-first' && step !== 'build-second') return state
  return { ...state, placed: state.placed + 1 }
}

/** Crosses (or un-crosses) a counter while subtracting. Only placed counters, never more than `second`. */
export function toggleCross(plan: BoardPlan, state: BoardState, index: number): BoardState {
  if (plan.mode !== 'sub' || index < 0 || index >= state.placed) return state
  if (state.crossed.includes(index)) return { ...state, crossed: state.crossed.filter((i) => i !== index) }
  if (state.crossed.length >= plan.second) return state
  return { ...state, crossed: [...state.crossed, index] }
}

/** Fully built board (pictorial stage, or revealed by a hint). Crosses the last counters when subtracting. */
export function completeBoard(plan: BoardPlan): BoardState {
  const placed = targetPlaced(plan)
  const crossed = plan.mode === 'sub' ? Array.from({ length: plan.second }, (_, i) => plan.first - plan.second + i) : []
  return { placed, crossed }
}

export function boardCells(plan: BoardPlan, state: BoardState): CellKind[] {
  return Array.from({ length: FRAME_CELLS }, (_, i): CellKind => {
    if (i >= state.placed) return 'empty'
    if (state.crossed.includes(i)) return 'crossed'
    return plan.mode === 'add' && i >= plan.first ? 'c2' : 'c1'
  })
}

/** Kid-friendly instruction for the current step (Catalan). */
export function instructionFor(plan: BoardPlan, step: BuildStep): string {
  switch (step) {
    case 'build-first':
      return `Posa ${plan.first} fitxes al marc.`
    case 'build-second':
      return `Ara posa-n’hi ${plan.second} més, d’un altre color.`
    case 'cross':
      return `Toca ${plan.second} fitxes per treure-les.`
    default:
      return plan.mode === 'count' ? 'Toca les fitxes per comptar-les.' : 'Quantes fitxes hi ha ara?'
  }
}
