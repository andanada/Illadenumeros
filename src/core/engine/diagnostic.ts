import type { SkillNode } from '../ambit/types'
import { ancestorsOf } from './graph'
import type { SkillStatus } from './mastery'

export type AnchorResult = 'superada' | 'parcial' | 'fallada'

export interface DiagnosticState {
  anchors: string[]
  index: number
  answers: boolean[]
  fast: boolean[]
  results: Record<string, AnchorResult>
  asked: number
  done: boolean
}

const QUESTIONS_PER_ANCHOR = 3
const MAX_QUESTIONS = 30

export function startDiagnostic(anchors: string[]): DiagnosticState {
  return { anchors, index: 0, answers: [], fast: [], results: {}, asked: 0, done: anchors.length === 0 }
}

export function currentAnchor(state: DiagnosticState): string | undefined {
  return state.done ? undefined : state.anchors[state.index]
}

export function recordDiagnostic(state: DiagnosticState, answer: { correct: boolean; fast: boolean }): DiagnosticState {
  const anchor = currentAnchor(state)
  if (anchor === undefined) return state

  const answers = [...state.answers, answer.correct]
  const fast = [...state.fast, answer.correct && answer.fast]
  const asked = state.asked + 1
  if (answers.length < QUESTIONS_PER_ANCHOR) {
    return { ...state, answers, fast, asked, done: asked >= MAX_QUESTIONS }
  }

  const correct = answers.filter(Boolean).length
  const allFast = correct === QUESTIONS_PER_ANCHOR && fast.every(Boolean)
  const results = { ...state.results }
  let index = state.index

  if (correct === QUESTIONS_PER_ANCHOR) {
    results[anchor] = 'superada'
    const skipped = allFast ? state.anchors[index + 1] : undefined
    if (skipped !== undefined) results[skipped] = 'superada'
    index += allFast ? 2 : 1
  } else if (correct === QUESTIONS_PER_ANCHOR - 1) {
    results[anchor] = 'parcial'
    index += 1
  } else {
    results[anchor] = 'fallada'
    return { ...state, answers: [], fast: [], results, asked, done: true }
  }

  return { ...state, index, answers: [], fast: [], results, asked, done: index >= state.anchors.length || asked >= MAX_QUESTIONS }
}

export interface Placement {
  mastery: number
  status: SkillStatus
}

const PLACEMENT: Record<AnchorResult, Placement> = {
  superada: { mastery: 0.75, status: 'consolidant' },
  parcial: { mastery: 0.62, status: 'consolidant' },
  fallada: { mastery: 0.3, status: 'aprenent' },
}

/**
 * Skills below a passed anchor become "consolidant" (to be confirmed by practice, never "dominada").
 * Skills above the stopping point stay new/locked (undefined here).
 */
export function placementFrom(state: DiagnosticState, skills: readonly SkillNode[]): Record<string, Placement> {
  const placement: Record<string, Placement> = {}
  for (const [anchor, result] of Object.entries(state.results)) {
    if (result === 'fallada') continue
    for (const ancestor of ancestorsOf(skills, anchor)) placement[ancestor] = PLACEMENT.superada
  }
  for (const [anchor, result] of Object.entries(state.results)) placement[anchor] = PLACEMENT[result]
  return placement
}
