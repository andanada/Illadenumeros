import type { CpaStage, GameId, MisconceptionId, SkillNode } from '../ambit/types'
import { isFluent, newFactState, updateFact, type FactState } from '../engine/leitner'
import { newSkillState, updateSkill, type SkillState } from '../engine/mastery'

/** Lenient fluency target while the child is still building confidence. */
export const FLUENCY_LENIENCY = 1.5
/** Fluency only counts towards mastery once enough facts of the skill were practiced. */
export const MIN_FACTS_FOR_FLUENCY = 3

export interface AnswerInput {
  skill: SkillNode
  factKey?: string
  correct: boolean
  rtMs: number
  hintsUsed: number
  misconception?: MisconceptionId
  cpaStage: CpaStage
  gameId: GameId
  /** Second or later try on the same item: stored, but it does not move the skill again. */
  retry?: boolean
  sessionId: string
  now: number
}

export interface Attempt {
  id: string
  ambitId: string
  skillId: string
  factKey?: string
  correct: boolean
  rtMs: number
  hintsUsed: number
  misconception?: MisconceptionId
  cpaStage: CpaStage
  gameId: GameId
  sessionId: string
  createdAt: number
}

export interface AnswerOutcome {
  skillState: SkillState
  factState?: FactState
  attempt: Attempt
  petals: number
  becameMastered: boolean
}

/** Pure: computes the new skill/fact state, the attempt record and the petals earned. */
export function applyAnswer(
  input: AnswerInput,
  previousSkill: SkillState | undefined,
  factStates: Readonly<Record<string, FactState>>,
  factsOfSkill: readonly string[],
  attemptId: string,
): AnswerOutcome {
  const target = input.skill.fluencyTargetMs * FLUENCY_LENIENCY
  // An answer after hints counts as a learning step, not as a clean success.
  const cleanCorrect = input.correct && input.hintsUsed === 0

  const factState =
    input.factKey === undefined
      ? undefined
      : updateFact(factStates[input.factKey] ?? newFactState(input.factKey, input.now), {
          correct: cleanCorrect,
          rtMs: input.rtMs,
          targetMs: target,
          now: input.now,
        })

  const merged = factState ? { ...factStates, [factState.factKey]: factState } : factStates
  const practiced = factsOfSkill.map((k) => merged[k]).filter((f): f is FactState => f !== undefined && f.attempts > 0)
  const fluentRatio = practiced.length === 0 ? 0 : practiced.filter((f) => isFluent(f, target)).length / practiced.length

  const before = previousSkill ?? newSkillState(input.skill.id)
  const skillState = input.retry
    ? before
    : updateSkill(before, {
        correct: cleanCorrect,
        fluentRatio,
        sessionId: input.sessionId,
        hasFacts: input.skill.hasFacts && practiced.length >= MIN_FACTS_FOR_FLUENCY,
        now: input.now,
      })

  const attempt: Attempt = {
    id: attemptId,
    ambitId: 'mates',
    skillId: input.skill.id,
    ...(input.factKey !== undefined ? { factKey: input.factKey } : {}),
    correct: input.correct,
    rtMs: input.rtMs,
    hintsUsed: input.hintsUsed,
    ...(input.misconception !== undefined ? { misconception: input.misconception } : {}),
    cpaStage: input.cpaStage,
    gameId: input.gameId,
    sessionId: input.sessionId,
    createdAt: input.now,
  }

  // Effort always earns something: 3 for a clean answer, 1 for getting there with help.
  const petals = cleanCorrect ? 3 : input.correct ? 1 : 0
  return {
    skillState,
    ...(factState ? { factState } : {}),
    attempt,
    petals,
    becameMastered: before.status !== 'dominada' && skillState.status === 'dominada',
  }
}
