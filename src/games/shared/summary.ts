import type { AnswerResult } from '../../features/play/useQuestionFlow'
import type { GameSummary } from '../../features/play/gameTypes'

/** Skills that became "dominada" in the answer, if any (pure). */
export function masteredFrom(result: AnswerResult, previous: readonly string[]): string[] {
  const outcome = result.outcome
  if (!outcome?.becameMastered) return [...previous]
  const id = outcome.skillState.skillId
  return previous.includes(id) ? [...previous] : [...previous, id]
}

/** Builds the end-of-game summary; petals are what the child earned during this game only. */
export function computeSummary(input: {
  answered: number
  correct: number
  petalsAtStart: number
  petalsNow: number
  masteredSkillIds: readonly string[]
}): GameSummary {
  return {
    answered: Math.max(0, input.answered),
    correct: Math.max(0, input.correct),
    petals: Math.max(0, input.petalsNow - input.petalsAtStart),
    masteredSkillIds: [...input.masteredSkillIds],
  }
}
