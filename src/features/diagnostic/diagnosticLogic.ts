import { FLUENCY_LENIENCY } from '../../core/progress/applyAnswer'
import type { DiagnosticState } from '../../core/engine/diagnostic'

/**
 * Turns a raw answer into the diagnostic input. Wrong answers still count (as `correct: false`)
 * so placement is honest, but the hint ladder never shows during the expedition.
 */
export function diagnosticAnswer(input: { correct: boolean; rtMs: number; fluencyTargetMs: number }): { correct: boolean; fast: boolean } {
  return { correct: input.correct, fast: input.rtMs < input.fluencyTargetMs * FLUENCY_LENIENCY }
}

export interface StripStep {
  anchor: string
  status: 'done' | 'current' | 'todo'
}

/** Expedition progress strip: one sticker per anchor; skipped anchors (fast answers) count as done. */
export function stripSteps(state: DiagnosticState): StripStep[] {
  return state.anchors.map((anchor, i) => ({
    anchor,
    status: state.results[anchor] !== undefined || i < state.index ? 'done' : i === state.index && !state.done ? 'current' : 'todo',
  }))
}
